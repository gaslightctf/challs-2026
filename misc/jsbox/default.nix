{
  callPackage,
  dockerTools,
  # nodejs-slim_24,
  socat,
}:
let
  jsbox = callPackage ./jsbox.nix { };

  # for some reason nodejs-slim_24's closure is so big that node:24-alpine is smaller
  nodejs-alpine = dockerTools.pullImage {
    imageName = "node";
    imageDigest = "sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f";
    finalImageTag = "24-alpine";
    arch = "amd64";
    sha256 = "sha256-73HgLm/vWl0ZfbWH02hU3/FOFPzsnf285rJFwgS6CeU=";
  };
in
dockerTools.streamLayeredImage {
  name = "jsbox";

  fromImage = nodejs-alpine;

  config.Cmd = [
    "${socat}/bin/socat"
    "TCP-LISTEN:1337,reuseaddr,fork"
    "EXEC:\"node ${jsbox}/jsbox.js\",pty,rawer,echo=0"
  ];
}
