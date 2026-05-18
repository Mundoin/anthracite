# Syntax Notes

- Synthetic LLDP detail output with Local Interface, Chassis ID, Remote Port ID, System Name, Management Address, and Capabilities lines.
- Real-style field names are used where truthful; the corpus stays explicit that this is synthetic and sanitised.
- Exact hostname or exact inventory id may resolve; contains-based matching must remain out-of-scope.
- If the remote system name is unknown, blank, or local-node-equal, the resolver must reject or defer.

Vendor note: 
real-style LLDP detail output; exact-match resolver only.
