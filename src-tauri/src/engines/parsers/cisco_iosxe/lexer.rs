//! cisco-iosxe line-oriented lexer.
//!
//! Emits a stream of `LexedLine` records. The parser core drives block
//! context separately (see `super::mod`). Determinism guarantee: same
//! bytes in, same `Vec<LexedLine>` out.

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LexedLine {
    /// 1-based line number from the original input.
    pub line_number: u64,
    /// Number of leading whitespace columns (spaces; tab = 1 column).
    pub indent: usize,
    /// Trimmed line with leading/trailing whitespace removed.
    pub trimmed: String,
    /// Verbatim line content, end-of-line stripped.
    pub raw: String,
    /// `true` if the trimmed line starts with `!` or is empty.
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

/// Split a trimmed config line into `(command, args)` where `command` is
/// the first whitespace-delimited token and `args` is the remainder
/// (un-split, preserving internal whitespace).
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
    fn lex_assigns_1_based_line_numbers() {
        let lines = lex("a\nb\nc\n");
        assert_eq!(lines[0].line_number, 1);
        assert_eq!(lines[1].line_number, 2);
        assert_eq!(lines[2].line_number, 3);
    }

    #[test]
    fn lex_captures_indent_in_spaces() {
        let lines = lex("interface Gi0/0\n  ip address 10.0.0.1 255.255.255.0\n");
        assert_eq!(lines[0].indent, 0);
        assert_eq!(lines[1].indent, 2);
    }

    #[test]
    fn lex_marks_blank_and_bang_lines_as_skip() {
        let lines = lex("hostname x\n\n! comment\nend\n");
        assert!(!lines[0].is_skip);
        assert!(lines[1].is_skip);
        assert!(lines[2].is_skip);
        assert!(!lines[3].is_skip);
    }

    #[test]
    fn lex_strips_cr_for_crlf_input() {
        let lines = lex("hostname x\r\n");
        assert_eq!(lines[0].raw, "hostname x");
        assert_eq!(lines[0].trimmed, "hostname x");
    }

    #[test]
    fn split_command_splits_first_token() {
        assert_eq!(split_command("hostname core-01"), ("hostname", "core-01"));
        assert_eq!(split_command("end"), ("end", ""));
        assert_eq!(
            split_command("ip route 0.0.0.0 0.0.0.0 10.0.0.1"),
            ("ip", "route 0.0.0.0 0.0.0.0 10.0.0.1")
        );
    }
}
