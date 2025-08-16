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
  // GET
  let res = http.get("http://container_bun:3000");

  // Validate response status
  check(res, { "status was 200": (r) => r.status == 200 });

  sleep(1);
}

export function handleSummary(data) {
  const now = new Date();
  
  // Convert to UTC+07:00 timezone (add 7 hours to UTC)
  const utcPlus7 = new Date(now.getTime() + (7 * 60 * 60 * 1000));

  const year = utcPlus7.getUTCFullYear();
  const month = (utcPlus7.getUTCMonth() + 1 < 10) ? "0" + (utcPlus7.getUTCMonth() + 1) : utcPlus7.getUTCMonth() + 1; // Month is 0-indexed (0 for January, 11 for December)
  const day = (utcPlus7.getUTCDate() < 10) ? "0" + utcPlus7.getUTCDate() : utcPlus7.getUTCDate();
  const hours = (utcPlus7.getUTCHours() < 10) ? "0" + utcPlus7.getUTCHours() : utcPlus7.getUTCHours();
  const minutes = (utcPlus7.getUTCMinutes() < 10) ? "0" + utcPlus7.getUTCMinutes() : utcPlus7.getUTCMinutes();
  const seconds = (utcPlus7.getUTCSeconds() < 10) ? "0" + utcPlus7.getUTCSeconds() : utcPlus7.getUTCSeconds();

  const filename = "/k6/1_health_check_" + year +  month + day + "_" + hours + minutes + seconds + ".html";
  
  return {
    [filename]: htmlReport(data, {
      title: "health_check_api_bun_elysiajs_mariadb_" + year + month + day + "_" + hours + minutes + seconds
    }),
  };
}