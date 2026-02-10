process.on("uncaughtException", (error) => {
  console.error("uncaughtException", error);
});
process.on("unhandledRejection", (error) => {
  console.error("unhandledRejection", error);
});
console.log("BOOT OK", new Date().toISOString());

async function start() {
  const port = Number(process.env.PORT) || 3000;

  if (process.env.BOOT_MINIMAL === "1") {
    const express = (await import("express")).default;
    const app = express();
    app.get("/__health", (_req, res) => res.status(200).send("OK"));
    app.listen(port, "0.0.0.0", () => {
      console.log("LISTENING", port);
    });
    return;
  }

  const { createApp } = await import("./app");
  const app = createApp();
  app.listen(port, "0.0.0.0", () => {
    console.log(`cloud-api: listening on ${port}`);
  });
}

start().catch((error) => {
  console.error("startup error", error);
  process.exit(1);
});
