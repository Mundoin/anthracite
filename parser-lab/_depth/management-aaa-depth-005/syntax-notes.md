# management-aaa-depth-005 syntax notes

## Cisco IOS-XE

- `aaa new-model`
- `username admin secret ...`
- `ip ssh version 2`
- `line vty 0 4`
- `transport input ssh`
- `snmp-server community public RO`
- `ntp server 192.0.2.53`

## Cisco IOS-XR

- `ssh server v2`
- `netconf-yang agent ssh`
- `snmp-server community ...`
- `ntp server ...`
- `logging host ...`
- `username admin secret ...`

## Huawei VRP

- `stelnet server enable`
- `snmp-agent community read ...`
- `ntp-service unicast-server ...`
- `user-interface vty 0 4`
- `authentication-mode aaa`
- `local-user admin password irreversible-cipher ...`

## MikroTik RouterOS

- `/ip service set ssh disabled=no`
- `/snmp set enabled=yes`
- `/system ntp client set enabled=yes`
- `/user add name=ops group=full`
- `/radius add service=login`

## Fortinet FortiOS

- `config system admin`
- `set accprofile super_admin`
- `config user local`
- `config system snmp community`
- `config system ntp`

## Nokia SR OS

- `configure system login-control idle-timeout ...`
- `configure system snmp`
- `configure system security ssh`
- `configure system time ntp`

