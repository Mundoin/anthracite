//! Junos set-style lexer — V1M.
//!
//! `set <a> <b> ... <z>` lines lower directly to `JunosLine { path:
//! [a, b, …, z], … }`. `delete` and `deactivate` lines are dropped;
//! V1M treats config as the union of `set` declarations only.
//!
//! Quoted-string handling: `"a b c"` collapses to a single token
//! `a b c`. List values inside brackets expand to one line per element.

use super::canonical::JunosLine;

const SET_PREFIX: &str = "set ";

pub fn looks_like_set_style(text: &str) -> bool {
    text.lines()
        .map(str::trim)
        .filter(|l| !l.is_empty() && !l.starts_with('#'))
        .take(20)
        .any(|l| l.starts_with(SET_PREFIX))
}

pub fn lex(text: &str) -> Vec<JunosLine> {
    let mut out = Vec::new();
    for (idx, raw_line) in text.lines().enumerate() {
        let lineno = (idx + 1) as u64;
        let trimmed = strip_comment(raw_line.trim());
        if trimmed.is_empty() {
            continue;
        }
        let trimmed = trimmed.trim_end_matches(';');
        let mut tokens = tokenise(trimmed);
        let head = tokens.first().map(|s| s.as_str()).unwrap_or("");
        match head {
            "set" => {
                tokens.remove(0); // drop "set"
                if tokens.is_empty() {
                    continue;
                }
                if let Some(expanded) = expand_bracket_list(&tokens) {
                    for variant in expanded {
                        out.push(JunosLine::new(variant, lineno, raw_line.to_string()));
                    }
                } else {
                    out.push(JunosLine::new(tokens, lineno, raw_line.to_string()));
                }
            }
            "deactivate" | "delete" => {
                // V1N-A: keep these visible as evidence. Orchestrator
                // dispatch classifies them as out-of-scope via
                // `unknown::OUT_OF_SCOPE_PREFIXES`. V1N-A does not
                // apply semantic delete/deactivate behaviour.
                out.push(JunosLine::new(tokens, lineno, raw_line.to_string()));
            }
            _ => {
                // Other non-set/non-deactivate/non-delete lines are
                // unsupported but visible — emit a leaf so dispatch can
                // surface them through the standard unknown path.
                if !tokens.is_empty() {
                    out.push(JunosLine::new(tokens, lineno, raw_line.to_string()));
                }
            }
        }
    }
    out
}

fn strip_comment(s: &str) -> String {
    if let Some(idx) = s.find('#') {
        s[..idx].trim_end().to_string()
    } else {
        s.to_string()
    }
}

/// Split a Junos config segment into whitespace-delimited tokens,
/// respecting double-quoted strings (which collapse into one token).
pub fn tokenise(s: &str) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    let mut cur = String::new();
    let mut in_quote = false;
    for ch in s.chars() {
        if in_quote {
            if ch == '"' {
                in_quote = false;
                out.push(std::mem::take(&mut cur));
            } else {
                cur.push(ch);
            }
            continue;
        }
        match ch {
            '"' => {
                if !cur.is_empty() {
                    out.push(std::mem::take(&mut cur));
                }
                in_quote = true;
            }
            c if c.is_whitespace() => {
                if !cur.is_empty() {
                    out.push(std::mem::take(&mut cur));
                }
            }
            _ => cur.push(ch),
        }
    }
    if !cur.is_empty() {
        out.push(cur);
    }
    out
}

/// If `tokens` contains a `[ … ]` group, return one expanded variant
/// per element with the brackets removed. Otherwise `None`.
fn expand_bracket_list(tokens: &[String]) -> Option<Vec<Vec<String>>> {
    let open = tokens.iter().position(|t| t == "[")?;
    let close = tokens.iter().rposition(|t| t == "]")?;
    if close <= open {
        return None;
    }
    let prefix: Vec<String> = tokens[..open].to_vec();
    let suffix: Vec<String> = tokens[close + 1..].to_vec();
    let elements: Vec<&String> = tokens[open + 1..close]
        .iter()
        .filter(|t| !t.is_empty())
        .collect();
    if elements.is_empty() {
        return None;
    }
    let mut variants: Vec<Vec<String>> = Vec::with_capacity(elements.len());
    for el in elements {
        let mut v = prefix.clone();
        v.push(el.clone());
        v.extend(suffix.clone());
        variants.push(v);
    }
    Some(variants)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_set_style() {
        assert!(looks_like_set_style("set system host-name foo\n"));
        assert!(!looks_like_set_style("system {\n  host-name foo;\n}\n"));
    }

    #[test]
    fn single_set_line_yields_one_record() {
        let lines = lex("set system host-name router1\n");
        assert_eq!(lines.len(), 1);
        assert_eq!(
            lines[0].path,
            vec!["system".to_string(), "host-name".to_string(), "router1".to_string()]
        );
    }

    #[test]
    fn bracket_list_expands_to_multiple_lines() {
        let lines = lex(
            "set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members [ v10 v20 ]\n",
        );
        assert_eq!(lines.len(), 2);
        assert_eq!(lines[0].path.last().unwrap(), "v10");
        assert_eq!(lines[1].path.last().unwrap(), "v20");
    }

    #[test]
    fn quoted_value_is_single_token() {
        let lines = lex("set system login message \"hello world\"\n");
        assert_eq!(lines[0].path.last().unwrap(), "hello world");
    }

    #[test]
    fn comment_lines_are_ignored() {
        let lines = lex("# top comment\nset system host-name h\n");
        assert_eq!(lines.len(), 1);
    }

    #[test]
    fn delete_and_deactivate_preserved_as_evidence() {
        // V1N-A: previously dropped; now surfaced so dispatch can
        // classify them as out-of-scope rather than vanishing.
        let lines = lex("delete system host-name\ndeactivate interfaces ge-0/0/0\nset system host-name h\n");
        assert_eq!(lines.len(), 3);
        assert_eq!(lines[0].path[0], "delete");
        assert_eq!(lines[1].path[0], "deactivate");
        assert_eq!(lines[2].path[0], "system");
    }
}
