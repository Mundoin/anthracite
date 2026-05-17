//! cisco-nxos line-oriented lexer — V1U.
//!
//! Same `LexedLine` shape as the cisco-iosxe / arista-eos lexers.
//! NX-OS configs use `!` for comments. `end` terminates the running-config
//! block.  Determinism guarantee: same bytes in, same `Vec<LexedLine>` out.

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LexedLine {
    pub line_number: u64,
    pub indent: usize,
    pub trimmed: String,
    pub raw: String,
    pub is_skip: bool,
}

pub fn lex(input: &str) -> Vec<LexedLine> {
    input
        .split('\n')
        .enumerate()
        .map(|(idx, raw_line)| {
            let line_number = (idx as u64) + 1;
            let raw = raw_line.trim_end_matches('\r').to_string();
            let indent = raw.chars().take_while(|c| *c == ' ').count();
            let trimmed = raw.trim().to_string();
            let is_skip = trimmed.is_empty() || trimmed.starts_with('!');
            LexedLine {
                line_number,
                indent,
                trimmed,
                raw,
                is_skip,
            }
        })
        .collect()
}

pub fn split_command(trimmed: &str) -> (&str, &str) {
    match trimmed.find(char::is_whitespace) {
        Some(i) => {
            let (cmd, rest) = trimmed.split_at(i);
            (cmd, rest.trim_start())
        }
        None => (trimmed, ""),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lex_assigns_line_numbers_and_indent() {
        let lines = lex("hostname nx\n  interface Ethernet1/1\n");
        assert_eq!(lines[0].line_number, 1);
        assert_eq!(lines[1].indent, 2);
    }

    #[test]
    fn lex_marks_skip_lines() {
        let lines = lex("hostname nx\n! comment\n\nend\n");
        assert!(!lines[0].is_skip);
        assert!(lines[1].is_skip);
        assert!(lines[2].is_skip);
        assert!(!lines[3].is_skip);
    }

    #[test]
    fn split_command_splits_first_token() {
        assert_eq!(split_command("vrf context MGMT"), ("vrf", "context MGMT"));
        assert_eq!(split_command("end"), ("end", ""));
    }
}
