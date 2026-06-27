import { spawnSync } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const checkOnly = process.argv.includes("--check");
const port = Number(process.env.PORT ?? 5173);

const build = spawnSync(
  process.execPath,
  [join(root, "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.build.json"],
  {
    cwd: root,
    stdio: "inherit"
  }
);

if (build.status !== 0) {
  if (build.error) {
    console.error(build.error.message);
  }
  process.exit(build.status ?? 1);
}

if (checkOnly) {
  console.log("ovOne v2 dev server check passed");
  process.exit(0);
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${port}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = normalize(join(root, pathname));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (!existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentType(filePath)
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`ovOne v2 running at http://localhost:${port}`);
});

function contentType(filePath) {
  switch (extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".map":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}
