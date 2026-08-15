{
  dockerTools,
  runCommand,
  bashInteractive,
  toybox,
  socat,
}:
let
  # one_gadget gives a execve("/bin/sh", NULL, NULL)
  # use a wrapper to provide a $PATH because we are nice :)
  shellWrapper = runCommand "shell-wrapper" { } ''
    mkdir -p $out/bin
    ln -s ${bashInteractive}/bin/bash $out/bin/bash
    cat > $out/bin/sh <<'EOF'
    #!${bashInteractive}/bin/bash
    export PATH="$PATH:/bin"
    export HOME="''${HOME:-/}"
    export TERM="''${TERM:-xterm}"
    if [ "$#" -eq 0 ]; then
      exec ${bashInteractive}/bin/bash -i
    fi
    exec ${bashInteractive}/bin/bash "$@"
    EOF
    chmod +x $out/bin/sh
  '';
in
dockerTools.streamLayeredImage {
  name = "thirds";

  contents = [
    ./handout

    shellWrapper
    toybox
  ];

  config.Labels."org.opencontainers.image.source" = "https://github.com/gaslightctf/challs-2026";
  config.Cmd = [
    "${socat}/bin/socat"
    "TCP-LISTEN:1337,reuseaddr,fork"
    "EXEC:\"/thirds\",pty,rawer,echo=0"
  ];
  config.Env = [
    "PATH=/bin"
    "HOME=/"
    "TERM=xterm"
  ];
}
