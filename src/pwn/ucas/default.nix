{
  callPackage,
  dockerTools,
  socat,
}:
let
  # ucas = callPackage ./ucas.nix { };
in
dockerTools.streamLayeredImage {
  name = "ucas";

  contents = [ ./handout ];

  config.Labels."org.opencontainers.image.source" = "https://github.com/gaslightctf/challs-2026";
  config.Cmd = [
    "${socat}/bin/socat"
    "TCP-LISTEN:1337,reuseaddr,fork"
    "EXEC:\"/ucas\",pty,rawer,echo=0"
  ];
}
