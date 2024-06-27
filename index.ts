import { Elysia } from "elysia";
import fs from "node:fs";
import path from "node:path";

const router = new Elysia();

const staticFolder = Bun.env.STATIC_FOLDER ?? "static";
const componentsFolder = Bun.env.COMPONENTS_FOLDER ?? "components";

let fileCache: Record<string, string> = {};
loadComponents();

fs.watch(staticFolder, { recursive: true }, () => {
  fileCache = {};
});

router.get("*", async ({ request }) => {
  let url = new URL(request.url).pathname;
  if (!/\.\w+$/.test(url)) url = path.join(url, "index.html");

  const filePath = path.join(staticFolder, url);
  if (!fs.existsSync(filePath))
    return new Response("Not Found", { status: 404 });

  if (!fileCache[filePath])
    fileCache[filePath] = fs.readFileSync(filePath, "utf-8");

  const contentType = extensionToContentType(path.extname(filePath).slice(1));

  if (contentType === "text/html") {
    const components = fs.readdirSync(componentsFolder);
    for (const component of components) {
      const componentPath = path.join(componentsFolder, component);
      if (!fileCache[componentPath])
        fileCache[componentPath] = fs.readFileSync(componentPath, "utf-8");
      fileCache[filePath] = fileCache[filePath].replace(
        new RegExp(`<!--\\s*${component}\\s*-->`, "g"),
        fileCache[componentPath]
      );
    }
  }

  return new Response(fileCache[filePath], {
    headers: {
      "Content-Type": contentType,
    },
  });
});

function extensionToContentType(extension: string): string {
  switch (extension) {
    case "html":
      return "text/html";
    case "css":
      return "text/css";
    case "js":
      return "text/javascript";
    case "json":
      return "application/json";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "ico":
      return "image/x-icon";
    default:
      return "text/plain";
  }
}

function loadComponents() {
  const components = fs.readdirSync(componentsFolder);
  for (const component of components) {
    fileCache[path.join(componentsFolder, component)] = fs.readFileSync(
      path.join(componentsFolder, component),
      "utf-8"
    );
  }
}

router.listen({
  hostname: Bun.env.HOSTNAME ?? "127.0.0.1",
  port: Bun.env.PORT ?? 37422,
});
