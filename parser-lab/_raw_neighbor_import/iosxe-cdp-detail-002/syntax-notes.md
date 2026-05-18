# Syntax Notes

- Synthetic CDP detail output with Device ID, Local Interface, Port ID, Address, Platform, Capabilities, and Holdtime lines.
- The corpus stays sanitised and synthetic even when the field names are real-style.
- Exact device-id or exact inventory id may resolve; hostname contains matching is out-of-scope.
- CDP remains evidence only; it never creates topology edges by itself.

Vendor note: 
real-style CDP detail output; exact-match resolver only.
