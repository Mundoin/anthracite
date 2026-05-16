//! Junos brace-style lexer — V1M.
//!
//! Scans a brace-style Junos config and flattens it into the same
//! `JunosLine` sequence that `lexer_set` produces for a semantically
//! equivalent `set …` config.
//!
//! Algorithm:
//! 1. Tokenise each non-comment line.
//! 2. Maintain a `prefix_stack: Vec<Vec<String>>` of path tokens
//!    inherited from open brace blocks.
//! 3. A line ending in `{` pushes its leading tokens onto the stack.
//! 4. A line ending in `;` emits a `JunosLine` whose path is the
//!    flattened stack + the line's tokens.
//! 5. A line consisting of `}` pops the stack.
//! 6. Bracket-list values expand to one emitted line per element.
//!
//! Comments (`/* … */` and `# …`) are stripped before tokenisation.
//! Quoted strings collapse to a single token.

use super::canonical::JunosLine;
use super::lexer_set::tokenise;

pub fn looks_like_brace_style(text: &str) -> bool {
    text.contains('{')
}

pub struct LexResult {
    pub lines: Vec<JunosLine>,
    pub truncated: bool,
}

pub fn lex(text: &str) -> LexResult {
    let stripped = strip_block_comments(text);
    let mut prefix_stack: Vec<Vec<String>> = Vec::new();
    let mut out: Vec<JunosLine> = Vec::new();
    for (idx, raw_line) in stripped.lines().enumerate() {
        let lineno = (idx + 1) as u64;
        let cleaned = strip_line_comment(raw_line);
        let trimmed = cleaned.trim();
        if trimmed.is_empty() {
            continue;
        }
        // V1N-A: expand compact `{ a; b; }` blocks into virtual lines
        // so the brace-depth walker handles them like the conventional
        // multi-line form. All virtual lines keep the original line
        // number for evidence traceability.
        for virtual_line in expand_compact_block(trimmed) {
            process_brace_line(&virtual_line, lineno, raw_line, &mut prefix_stack, &mut out);
        }
    }
    let truncated = !prefix_stack.is_empty();
    LexResult {
        lines: out,
        truncated,
    }
}

/// Expand a single source line into one or more "virtual" lines so the
/// brace walker can treat compact `{ a; b; }` blocks the same way as
/// multi-line ones. Returns a `Vec<String>` of trimmed lines each
/// ending in `{`, `;`, or being a single `}`. The simple cases (an
/// already-clean line) return a single-element Vec.
fn expand_compact_block(trimmed: &str) -> Vec<String> {
    // Fast path: if there are no `{`, `}`, or `;` mixed mid-line, the
    // line is already in canonical shape.
    let has_brace = trimmed.contains('{') || trimmed.contains('}');
    let has_semi_in_middle = trimmed.find(';').map(|i| i + 1 < trimmed.len()).unwrap_or(false);
    if !has_brace && !has_semi_in_middle {
        return vec![trimmed.to_string()];
    }
    // Split on `{`, `}`, and `;` boundaries while preserving the
    // terminators on the preceding chunk. Quoted strings are not
    // expected to contain these glyphs in V1N-A fixtures (Junos
    // configs in our corpus avoid them).
    let mut out: Vec<String> = Vec::new();
    let mut current = String::new();
    for ch in trimmed.chars() {
        match ch {
            '{' => {
                current.push('{');
                let s = current.trim().to_string();
                if !s.is_empty() {
                    out.push(s);
                }
                current.clear();
            }
            ';' => {
                current.push(';');
                let s = current.trim().to_string();
                if !s.is_empty() {
                    out.push(s);
                }
                current.clear();
            }
            '}' => {
                let s = current.trim().to_string();
                if !s.is_empty() {
                    out.push(s);
                }
                out.push("}".to_string());
                current.clear();
            }
            _ => current.push(ch),
        }
    }
    let tail = current.trim();
    if !tail.is_empty() {
        out.push(tail.to_string());
    }
    out
}

fn process_brace_line(
    trimmed: &str,
    lineno: u64,
    raw_line: &str,
    prefix_stack: &mut Vec<Vec<String>>,
    out: &mut Vec<JunosLine>,
) {
    // Handle close-brace lines (possibly several on one line).
    if trimmed.chars().all(|c| c == '}' || c.is_whitespace()) {
        for _ in trimmed.chars().filter(|c| *c == '}') {
            prefix_stack.pop();
        }
        return;
    }

    if let Some(body) = trimmed.strip_suffix('{') {
        let tokens = tokenise(body.trim());
        prefix_stack.push(tokens);
        return;
    }

    if let Some(body) = trimmed.strip_suffix(';') {
        let line_tokens = tokenise(body.trim());
        if line_tokens.is_empty() {
            return;
        }
        let prefix_flat: Vec<String> =
            prefix_stack.iter().flatten().cloned().collect();
        let combined: Vec<String> = prefix_flat
            .into_iter()
            .chain(line_tokens.into_iter())
            .collect();
        if let Some(variants) = expand_bracket_list(&combined) {
            for v in variants {
                out.push(JunosLine::new(v, lineno, raw_line.to_string()));
            }
        } else {
            out.push(JunosLine::new(combined, lineno, raw_line.to_string()));
        }
        return;
    }

    // A statement without `;` or `{` ending — Junos sometimes writes
    // bare keywords (e.g. `inactive: foo`). Treat as a leaf with
    // current tokens; survives malformed input without panic.
    let line_tokens = tokenise(trimmed);
    if line_tokens.is_empty() {
        return;
    }
    let prefix_flat: Vec<String> =
        prefix_stack.iter().flatten().cloned().collect();
    let combined: Vec<String> = prefix_flat
        .into_iter()
        .chain(line_tokens.into_iter())
        .collect();
    out.push(JunosLine::new(combined, lineno, raw_line.to_string()));
}

fn strip_block_comments(text: &str) -> String {
    // Minimal `/* … */` removal. Junos allows multi-line block comments.
    let mut out = String::with_capacity(text.len());
    let mut chars = text.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '/' && chars.peek() == Some(&'*') {
            chars.next();
            // Consume until `*/` or end.
            while let Some(c2) = chars.next() {
                if c2 == '*' && chars.peek() == Some(&'/') {
                    chars.next();
                    break;
                }
            }
            out.push(' ');
        } else {
            out.push(c);
        }
    }
    out
}

fn strip_line_comment(s: &str) -> String {
    // Drop `# …` to end-of-line. Junos brace style rarely uses `#`
    // mid-stanza, but supporting it keeps the two lexers symmetric.
    if let Some(idx) = s.find('#') {
        // Be careful not to strip `#` inside quoted strings. For V1M we
        // accept the simplification: configs in our fixtures don't use
        // `#` inside quotes.
        s[..idx].trim_end().to_string()
    } else {
        s.to_string()
    }
}

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
    fn detects_brace_style() {
        assert!(looks_like_brace_style("system { host-name foo; }\n"));
        assert!(!looks_like_brace_style("set system host-name foo\n"));
    }

    #[test]
    fn brace_flattens_to_path_tokens() {
        let r = lex("system {\n  host-name router1;\n}\n");
        assert!(!r.truncated);
        assert_eq!(r.lines.len(), 1);
        assert_eq!(
            r.lines[0].path,
            vec!["system".to_string(), "host-name".to_string(), "router1".to_string()]
        );
    }

    #[test]
    fn deeply_nested_address_matches_set_style() {
        let cfg = "interfaces {\n  ge-0/0/0 {\n    unit 0 {\n      family inet {\n        address 10.0.0.1/24;\n      }\n    }\n  }\n}\n";
        let r = lex(cfg);
        assert_eq!(r.lines.len(), 1);
        assert_eq!(
            r.lines[0].path,
            vec![
                "interfaces".to_string(),
                "ge-0/0/0".to_string(),
                "unit".to_string(),
                "0".to_string(),
                "family".to_string(),
                "inet".to_string(),
                "address".to_string(),
                "10.0.0.1/24".to_string()
            ]
        );
    }

    #[test]
    fn truncated_input_flag_flips() {
        let r = lex("system {\n  host-name foo;\n");
        assert!(r.truncated);
    }

    #[test]
    fn bracket_list_in_brace_expands() {
        let cfg = "interfaces {\n  ge-0/0/0 {\n    unit 0 {\n      family ethernet-switching {\n        vlan {\n          members [ v10 v20 ];\n        }\n      }\n    }\n  }\n}\n";
        let r = lex(cfg);
        let leaves: Vec<&JunosLine> = r
            .lines
            .iter()
            .filter(|l| l.path.contains(&"members".to_string()))
            .collect();
        assert_eq!(leaves.len(), 2);
    }

    #[test]
    fn compact_single_line_brace_block_expands() {
        // V1N-A: compact `{ a; b; }` is now first-class.
        let cfg = "system { host-name foo; domain-name bar.test; }\n";
        let r = lex(cfg);
        assert!(r
            .lines
            .iter()
            .any(|l| l.path == vec!["system".to_string(), "host-name".to_string(), "foo".to_string()]));
        assert!(r
            .lines
            .iter()
            .any(|l| l.path
                == vec![
                    "system".to_string(),
                    "domain-name".to_string(),
                    "bar.test".to_string()
                ]));
    }

    #[test]
    fn compact_block_with_inline_brackets_expands_both() {
        let cfg = "vlan { members [ v10 v20 ]; }\n";
        let r = lex(cfg);
        let members: Vec<&JunosLine> = r
            .lines
            .iter()
            .filter(|l| l.path.first().map(|s| s.as_str()) == Some("vlan"))
            .collect();
        assert_eq!(members.len(), 2);
    }

    #[test]
    fn block_comment_stripped() {
        let r = lex("/* hello */ system { host-name h; }\n");
        assert_eq!(r.lines.len(), 1);
    }
}
