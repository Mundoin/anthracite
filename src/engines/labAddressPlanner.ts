import type { LabAddressPlan, LabSubnet } from "../types/labEnvironment";
import { LAB_MAX_DEVICES, LAB_MAX_LINKS } from "../types/labEnvironment";
import type { IpAddressModel } from "../types/networkModel";

export interface AddressPlanInput {
  readonly scenario_id: string;
  readonly seed: string;
  readonly device_count: number;
  readonly link_count: number;
  readonly site_count: number;
}

export interface AllocatedAddresses {
  readonly plan: LabAddressPlan;
  readonly management_ip_for: (deviceIndex: number) => IpAddressModel;
  readonly loopback_ip_for: (deviceIndex: number) => IpAddressModel;
  readonly transit_pair_for: (
    linkIndex: number
  ) => { readonly a: IpAddressModel; readonly b: IpAddressModel };
}

const MGMT_SUBNET = "10.10.0.0/24";
const LOOP_SUBNET = "10.255.0.0/24";
const TRANSIT_SUBNET = "10.20.0.0/16";

export function planAddresses(input: AddressPlanInput): AllocatedAddresses {
  const { device_count, link_count } = input;

  if (device_count > LAB_MAX_DEVICES) {
    throw new Error(
      `Device count ${device_count} exceeds LAB_MAX_DEVICES ${LAB_MAX_DEVICES}`
    );
  }

  if (link_count > LAB_MAX_LINKS) {
    throw new Error(
      `Link count ${link_count} exceeds LAB_MAX_LINKS ${LAB_MAX_LINKS}`
    );
  }

  const allocated: LabSubnet[] = [];

  // Management subnet (10.10.0.0/24)
  allocated.push({
    id: "subnet-mgmt-10.10.0.0-24",
    cidr: MGMT_SUBNET,
    purpose: "management",
    site_id: null,
    vlan_id: null,
  });

  // Loopback subnet (10.255.0.0/24)
  allocated.push({
    id: "subnet-loop-10.255.0.0-24",
    cidr: LOOP_SUBNET,
    purpose: "loopback",
    site_id: null,
    vlan_id: null,
  });

  // Transit /30s (one per link)
  for (let i = 0; i < link_count; i++) {
    const offset = i * 4;
    const secondOctet = Math.floor(offset / 256);
    const thirdOctet = offset % 256;
    const cidr = `10.${20 + secondOctet}.${thirdOctet}.0/30`;

    allocated.push({
      id: `subnet-transit-link-${i}`,
      cidr,
      purpose: "transit",
      site_id: null,
      vlan_id: null,
    });
  }

  const plan: LabAddressPlan = {
    management_subnet: MGMT_SUBNET,
    loopback_subnet: LOOP_SUBNET,
    transit_subnet: TRANSIT_SUBNET,
    vlan_subnets: [],
    site_subnets: [],
    allocated,
  };

  return {
    plan,
    management_ip_for: (deviceIndex: number): IpAddressModel => ({
      family: "v4",
      address: `10.10.0.${deviceIndex + 1}`,
      prefix_length: 24,
      secondary: false,
      vrf: null,
    }),
    loopback_ip_for: (deviceIndex: number): IpAddressModel => ({
      family: "v4",
      address: `10.255.0.${deviceIndex + 1}`,
      prefix_length: 32,
      secondary: false,
      vrf: null,
    }),
    transit_pair_for: (
      linkIndex: number
    ): { readonly a: IpAddressModel; readonly b: IpAddressModel } => {
      // Within 10.20.0.0/16, each /30 gets 4 addresses starting at offset i*4
      // Link i uses addresses at i*4, i*4+1, i*4+2, i*4+3
      // Usable hosts are at i*4+1 and i*4+2
      const baseOffset = linkIndex * 4;
      const secondOctet = Math.floor(baseOffset / 256);
      const fourthOctetA = (baseOffset % 256) + 1;
      const fourthOctetB = (baseOffset % 256) + 2;

      return {
        a: {
          family: "v4",
          address: `10.${20 + secondOctet}.0.${fourthOctetA}`,
          prefix_length: 30,
          secondary: false,
          vrf: null,
        },
        b: {
          family: "v4",
          address: `10.${20 + secondOctet}.0.${fourthOctetB}`,
          prefix_length: 30,
          secondary: false,
          vrf: null,
        },
      };
    },
  };
}
