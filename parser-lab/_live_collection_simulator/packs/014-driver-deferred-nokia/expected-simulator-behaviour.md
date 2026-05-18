# 014-driver-deferred-nokia expected simulator behaviour

- Status: blocked
- The simulator may name the fixture, but it must still stop before import because the platform is deferred.
- Keep the fixture in the prep pack only; do not route it into V1AP/V1AQ from the simulator.
- The review surface remains unchanged because the simulator is intentionally not allowed to import.
