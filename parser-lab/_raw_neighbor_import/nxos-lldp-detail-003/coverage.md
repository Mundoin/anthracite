# Coverage

- local interface extraction
- remote system/device name extraction
- remote chassis ID extraction
- remote port ID extraction
- management address extraction when present
- capability/platform hints
- exact inventory matching only
- no fuzzy matching
- no interface-description promotion
- no subnet/VLAN inference

Current focus: exact inventory resolution and conservative neighbour import behaviour.
OCC can later integrate only when exact matching succeeds.
