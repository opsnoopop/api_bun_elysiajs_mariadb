import http from "k6/http";
import { check, sleep } from "k6";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

// Test configuration
export const options = {
  thresholds: {
    // Assert that 99% of requests finish within 3000ms.
    http_req_duration: ["p(99) < 3000"],
  },
  // Ramp the number of virtual users up and down
  stages: [
    { duration: "10s", target: 10000 },
    { duration: "10s", target: 10000 },
    { duration: "10s", target: 10000 },
  ],
};

const headers = {
  headers: {
    "Content-Type": "application/json"
  },
};

// Simulated user behavior
export default function () {
  // POST
  let body = {
    "username":"optest",
    "email":"opsnoopop@hotmail.com"
  };
  let res = http.post("http://container_bun:3000/users", JSON.stringify(body), headers);

  // Validate response status
  check(res, { "status was 201": (r) => r.status == 201 });

  sleep(1);
}

export function handleSummary(data) {
  return {
    "/k6/2_result_bun_create_user.html": htmlReport(data),
  };
}