{
  dockerTools,
  toybox,
  socat,
}:
dockerTools.streamLayeredImage {
  name = "ucas";

  contents = [
    ./handout

    dockerTools.binSh
    toybox
  ];

  config.Labels."org.opencontainers.image.source" = "https://github.com/gaslightctf/challs-2026";
  config.Cmd = [
    "${socat}/bin/socat"
    "TCP-LISTEN:1337,reuseaddr,fork"
    "EXEC:\"/ucas\",pty,rawer,echo=0"
  ];
  config.Env = [
    "PATH=/bin"
  ];
}
