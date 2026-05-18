# Syntax Notes

- Synthetic Junos LLDP detail output uses real-style field names such as Local Interface, Chassis ID, Port ID, System Name, and Management Address.
- Unit suffixes such as ge-0/0/0.0 should be normalised carefully and only when the platform already supplies them.
- Exact inventory resolution remains mandatory before topology edges are accepted.
- This pack stays synthetic and sanitised.

Vendor note: 
real-style Junos LLDP output; exact-match resolver only.
