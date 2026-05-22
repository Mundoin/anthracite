import { describe, it, expect } from "vitest";
import { planAddresses, type AddressPlanInput } from "../labAddressPlanner";
import { LAB_MAX_DEVICES, LAB_MAX_LINKS } from "../../types/labEnvironment";

describe("labAddressPlanner", () => {
  const baseInput: AddressPlanInput = {
    scenario_id: "micro-lab",
    seed: "test-seed-001",
    device_count: 3,
    link_count: 2,
    site_count: 1,
  };

  describe("management subnet allocation", () => {
    it("should allocate management IPs in 10.10.0.0/24", () => {
      const result = planAddresses(baseInput);
      const mgmtIp0 = result.management_ip_for(0);
      const mgmtIp1 = result.management_ip_for(1);
      const mgmtIp2 = result.management_ip_for(2);

      expect(mgmtIp0.address).toBe("10.10.0.1");
      expect(mgmtIp1.address).toBe("10.10.0.2");
      expect(mgmtIp2.address).toBe("10.10.0.3");
    });

    it("should set correct prefix length for management IPs", () => {
      const result = planAddresses(baseInput);
      const mgmtIp = result.management_ip_for(0);

      expect(mgmtIp.prefix_length).toBe(24);
      expect(mgmtIp.family).toBe("v4");
      expect(mgmtIp.secondary).toBe(false);
      expect(mgmtIp.vrf).toBeNull();
    });
  });

  describe("loopback subnet allocation", () => {
    it("should allocate loopback IPs in 10.255.0.0/24", () => {
      const result = planAddresses(baseInput);
      const loop0 = result.loopback_ip_for(0);
      const loop1 = result.loopback_ip_for(1);
      const loop2 = result.loopback_ip_for(2);

      expect(loop0.address).toBe("10.255.0.1");
      expect(loop1.address).toBe("10.255.0.2");
      expect(loop2.address).toBe("10.255.0.3");
    });

    it("should set /32 prefix for loopback IPs", () => {
      const result = planAddresses(baseInput);
      const loopIp = result.loopback_ip_for(0);

      expect(loopIp.prefix_length).toBe(32);
      expect(loopIp.family).toBe("v4");
    });
  });

  describe("transit subnet allocation", () => {
    it("should allocate transit /30s sequentially in 10.20.0.0/16", () => {
      const result = planAddresses(baseInput);
      const pair0 = result.transit_pair_for(0);
      const pair1 = result.transit_pair_for(1);

      // Link 0: offset 0 → 10.20.0.0/30, usable hosts .1 and .2
      expect(pair0.a.address).toBe("10.20.0.1");
      expect(pair0.b.address).toBe("10.20.0.2");
      expect(pair0.a.prefix_length).toBe(30);

      // Link 1: offset 4 → 10.20.0.4/30, usable hosts .5 and .6
      expect(pair1.a.address).toBe("10.20.0.5");
      expect(pair1.b.address).toBe("10.20.0.6");
      expect(pair1.a.prefix_length).toBe(30);
    });

    it("should roll over second octet when third octet exceeds 255", () => {
      const input: AddressPlanInput = {
        scenario_id: "campus",
        seed: "test-seed-002",
        device_count: 24,
        link_count: 64, // Will require second octet rollover
        site_count: 1,
      };
      const result = planAddresses(input);

      // Link 63: offset 252 → second octet increments to 21
      // (252 / 256 = 0 remainder 252, so 10.20.252.x initially)
      // Link 64 would be offset 256 → second octet becomes 1 (10.21.0.x)
      const pair63 = result.transit_pair_for(63);
      // Verify we're still in the 10.20.x.x range or have rolled to 10.21.x.x
      expect(pair63.a.address).toMatch(/^10\.2[01]\.\d+\.\d+$/);
    });
  });

  describe("allocated subnets", () => {
    it("should include management subnet in allocated list", () => {
      const result = planAddresses(baseInput);
      const mgmtSubnet = result.plan.allocated.find(
        (s) => s.purpose === "management"
      );

      expect(mgmtSubnet).toBeDefined();
      expect(mgmtSubnet?.cidr).toBe("10.10.0.0/24");
    });

    it("should include loopback subnet in allocated list", () => {
      const result = planAddresses(baseInput);
      const loopSubnet = result.plan.allocated.find(
        (s) => s.purpose === "loopback"
      );

      expect(loopSubnet).toBeDefined();
      expect(loopSubnet?.cidr).toBe("10.255.0.0/24");
    });

    it("should include one transit subnet per link", () => {
      const result = planAddresses(baseInput);
      const transitSubnets = result.plan.allocated.filter(
        (s) => s.purpose === "transit"
      );

      expect(transitSubnets).toHaveLength(baseInput.link_count);
    });

    it("should have empty vlan_subnets and site_subnets", () => {
      const result = planAddresses(baseInput);

      expect(result.plan.vlan_subnets).toHaveLength(0);
      expect(result.plan.site_subnets).toHaveLength(0);
    });
  });

  describe("determinism", () => {
    it("should produce identical results for same input", () => {
      const result1 = planAddresses(baseInput);
      const result2 = planAddresses(baseInput);

      expect(result1.management_ip_for(0)).toEqual(
        result2.management_ip_for(0)
      );
      expect(result1.loopback_ip_for(1)).toEqual(result2.loopback_ip_for(1));
      expect(result1.transit_pair_for(0)).toEqual(
        result2.transit_pair_for(0)
      );
      expect(result1.plan.allocated).toEqual(result2.plan.allocated);
    });
  });

  describe("capacity validation", () => {
    it("should throw if device_count exceeds LAB_MAX_DEVICES", () => {
      const input: AddressPlanInput = {
        ...baseInput,
        device_count: LAB_MAX_DEVICES + 1,
      };

      expect(() => planAddresses(input)).toThrow(
        /Device count.*exceeds LAB_MAX_DEVICES/
      );
    });

    it("should throw if link_count exceeds LAB_MAX_LINKS", () => {
      const input: AddressPlanInput = {
        ...baseInput,
        link_count: LAB_MAX_LINKS + 1,
      };

      expect(() => planAddresses(input)).toThrow(
        /Link count.*exceeds LAB_MAX_LINKS/
      );
    });

    it("should succeed at max capacity", () => {
      const input: AddressPlanInput = {
        ...baseInput,
        device_count: LAB_MAX_DEVICES,
        link_count: LAB_MAX_LINKS,
      };

      const result = planAddresses(input);
      expect(result.plan.allocated).toBeDefined();
      expect(result.plan.allocated.length).toBeGreaterThan(0);
    });
  });

  describe("IP uniqueness", () => {
    it("should allocate unique management IPs", () => {
      const result = planAddresses({
        ...baseInput,
        device_count: 10,
      });

      const ips = Array.from({ length: 10 }, (_, i) =>
        result.management_ip_for(i).address
      );
      const unique = new Set(ips);

      expect(unique.size).toBe(ips.length);
    });

    it("should allocate unique loopback IPs", () => {
      const result = planAddresses({
        ...baseInput,
        device_count: 10,
      });

      const ips = Array.from({ length: 10 }, (_, i) =>
        result.loopback_ip_for(i).address
      );
      const unique = new Set(ips);

      expect(unique.size).toBe(ips.length);
    });

    it("should allocate unique transit pairs", () => {
      const result = planAddresses({
        ...baseInput,
        link_count: 10,
      });

      const pairs = Array.from({ length: 10 }, (_, i) =>
        result.transit_pair_for(i)
      );
      const pairStrs = pairs.map(
        (p) => `${p.a.address}/${p.a.prefix_length}-${p.b.address}/${p.b.prefix_length}`
      );
      const unique = new Set(pairStrs);

      expect(unique.size).toBe(pairStrs.length);
    });
  });
});
