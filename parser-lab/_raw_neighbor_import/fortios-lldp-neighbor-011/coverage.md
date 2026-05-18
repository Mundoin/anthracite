# Coverage

- LLDP-like neighbour evidence only if the real command shape is confirmed
- local interface extraction where available
- remote system/device name extraction where available
- remote port ID extraction where available
- management address extraction where available
- exact inventory matching only
- no fuzzy matching
- unsupported format must stay visible

Current focus: exact inventory resolution and conservative neighbour import behaviour.
OCC can later integrate only when exact matching succeeds.
