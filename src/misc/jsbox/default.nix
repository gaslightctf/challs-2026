{
  callPackage,
  dockerTools,
  # nodejs-slim_24,
  socat,
}:
let
  jsbox = callPackage ./jsbox.nix { };

  # for some reason nodejs-slim_24's closure is so big that distroless/nodejs is smaller
  nodejs-image = dockerTools.pullImage {
    imageName = "gcr.io/distroless/nodejs24-debian13";
    imageDigest = "sha256:4841a6a2ccbc80b48cc3279e14f94ae48edc1eb5cc7feed0596d73feb57ec2c3";

    arch = "amd64";
    hash = "sha256-Y3eOS9xx9FKVAD8MWguiLFWcJSPYtsO17295L47pPzs=";
  };
in
dockerTools.streamLayeredImage {
  name = "jsbox";

  fromImage = nodejs-image;

  config.Labels."org.opencontainers.image.source" = "https://github.com/gaslightctf/challs-2026";
  config.Cmd = [
    "${socat}/bin/socat"
    "TCP-LISTEN:1337,reuseaddr,fork"
    "EXEC:\"/nodejs/bin/node ${jsbox}/jsbox.js\",pty,rawer,echo=0"
  ];
}
