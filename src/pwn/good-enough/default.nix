{
  dockerTools,
  socat,
}:
dockerTools.streamLayeredImage {
  name = "good-enough";

  contents = [
    ./handout
    dockerTools.binSh
  ];

  config.Labels."org.opencontainers.image.source" = "https://github.com/gaslightctf/challs-2026";
  config.Cmd = [
    "${socat}/bin/socat"
    "TCP-LISTEN:1337,reuseaddr,fork"
    "EXEC:\"/good-enough\",pty,rawer,echo=0"
  ];
}
