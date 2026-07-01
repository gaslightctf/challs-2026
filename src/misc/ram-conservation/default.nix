{
  dockerTools,
  socat,
  writeShellApplication,
  toybox,
}:
let
  jail = writeShellApplication {
    name = "jail";
    text = ''
      echo "   .-.                /\\           .-.                                                                                ";
      echo "  (_) )-.         _  / |          /|/|                                                         /  .-.              ";
      echo "     /   \\       (  /  |  .      /   |      .-.  .-._..  .-.     .    .-.  ).--.)   .-..-. ---/---\`-'.-._..  .-.   ";
      echo "    /     )       \`/.__|_.'     /    |\`-=-.(    (   )  )/   )   / \\ ./.-'_/    (   /  (  |   /   /  (   )  )/   )  ";
      echo " .-/  \`--'    .:' /    |   .-' /     |      \`---'\`-'  '/   (   / ._)(__.'/      \\_/    \`-'-'/ _.(__. \`-'  '/   (   ";
      echo "(_/     \`-._)(__.'     \`-'(__.'      \`.                     \`-/                                                 \`- ";

      while :; do
        printf "$ "
        read -r in _
        echo "validating '$in'..."
        sleep 0.25
        if [ ''${#in} -le 10 ]; then
          eval "$in" 2>&1 || true
        else
          echo "nope"
        fi
      done
    '';

    runtimeInputs = [
      toybox
    ];
  };

in
dockerTools.streamLayeredImage {
  name = "ram-conservation";

  config.Labels."org.opencontainers.image.source" = "https://github.com/gaslightctf/challs-2026";
  config.Cmd = [
    "${socat}/bin/socat"
    "TCP-LISTEN:1337,reuseaddr,fork"
    "EXEC:\"${jail}/bin/jail\",pty,rawer,echo=0"
  ];
}
