//! ParserContext — shared block-stack for every vendor parser.
//!
//! Per V1K PROPOSAL §4.2: a "boring deterministic line walker with
//! explicit context stack". Pushed on `interface …`, `router …`,
//! `line …`, `vrf definition …`, `vlan …`. Popped on `!`, on de-indent,
//! or on encountering a new top-level command.
//!
//! `UnknownConfigLine.context_path` is built by joining the stack with
//! `" > "`.

#[derive(Debug, Clone, Default)]
pub struct ParserContext {
    frames: Vec<Frame>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Frame {
    pub label: String,
    pub indent: usize,
}

impl ParserContext {
    pub fn new() -> Self {
        Self { frames: Vec::new() }
    }

    pub fn push(&mut self, label: impl Into<String>, indent: usize) {
        self.frames.push(Frame {
            label: label.into(),
            indent,
        });
    }

    pub fn pop(&mut self) -> Option<Frame> {
        self.frames.pop()
    }

    pub fn clear(&mut self) {
        self.frames.clear();
    }

    pub fn depth(&self) -> usize {
        self.frames.len()
    }

    pub fn current(&self) -> Option<&Frame> {
        self.frames.last()
    }

    /// Frame immediately below the top, if any. Used by nested
    /// dispatch (e.g. `address-family` under `vrf definition`) to find
    /// the parent block's label.
    pub fn parent(&self) -> Option<&Frame> {
        let d = self.frames.len();
        if d >= 2 {
            self.frames.get(d - 2)
        } else {
            None
        }
    }

    pub fn current_label(&self) -> Option<&str> {
        self.frames.last().map(|f| f.label.as_str())
    }

    /// `" > "`-joined path for `UnknownConfigLine.context_path`.
    pub fn path(&self) -> Option<String> {
        if self.frames.is_empty() {
            None
        } else {
            Some(
                self.frames
                    .iter()
                    .map(|f| f.label.as_str())
                    .collect::<Vec<_>>()
                    .join(" > "),
            )
        }
    }

    /// Pop frames whose indent is >= the given indent level. Used when a
    /// new line de-indents past one or more block boundaries.
    pub fn pop_to_indent(&mut self, indent: usize) {
        while let Some(top) = self.frames.last() {
            if top.indent >= indent {
                self.frames.pop();
            } else {
                break;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_context_has_no_path() {
        let c = ParserContext::new();
        assert_eq!(c.path(), None);
        assert_eq!(c.depth(), 0);
    }

    #[test]
    fn push_and_pop_track_depth_and_label() {
        let mut c = ParserContext::new();
        c.push("interface GigabitEthernet0/0/0", 0);
        assert_eq!(c.depth(), 1);
        assert_eq!(c.current_label(), Some("interface GigabitEthernet0/0/0"));
        let f = c.pop().unwrap();
        assert_eq!(f.label, "interface GigabitEthernet0/0/0");
        assert!(c.current().is_none());
    }

    #[test]
    fn path_joins_frames_with_arrow() {
        let mut c = ParserContext::new();
        c.push("vrf definition CUST-A", 0);
        c.push("address-family ipv4", 1);
        assert_eq!(
            c.path().as_deref(),
            Some("vrf definition CUST-A > address-family ipv4")
        );
    }

    #[test]
    fn pop_to_indent_removes_deeper_frames() {
        let mut c = ParserContext::new();
        c.push("vrf definition CUST-A", 0);
        c.push("address-family ipv4", 1);
        c.push("nested-thing", 2);
        c.pop_to_indent(1);
        assert_eq!(c.depth(), 1);
        assert_eq!(c.current_label(), Some("vrf definition CUST-A"));
    }
}
