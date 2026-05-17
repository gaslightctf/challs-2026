{ self, ... }:
let
  CONTAINER_REGISTRY = "ghcr.io/gaslightctf/challs-2026";
in
{
  perSystem =
    { pkgs, ... }:
    {
      apps.deploy-ghcr.program =
        let
          challs = import ./_helpers/getChallenges.nix self;

          nixChalls = challs |> builtins.filter ({ src, ... }: builtins.pathExists "${src}/default.nix");
          deployNixChalls =
            nixChalls
            |> map (
              { chall, src, ... }:
              # bash
              ''
                echo "== Deploying ${chall} to ${CONTAINER_REGISTRY}/${chall}:$TARGET_ENV"
                challImage="$(mktemp)"
                "${pkgs.callPackage "${src}/default.nix" { }}" > "$challImage"
                skopeo copy \
                  --insecure-policy "docker-archive:$challImage" \
                  "docker://${CONTAINER_REGISTRY}/${chall}:$TARGET_ENV"
                rm "$challImage"
                unset challImage

                echo "-- Done deploying ${chall}"
                echo
              ''
            )
            |> builtins.concatStringsSep "\n";
        in
        pkgs.writeShellApplication {
          name = "deploy-ghcr";

          text = ''
            case "$GARNIX_BRANCH" in
               "master") TARGET_ENV="dev";;
               "prod") TARGET_ENV="prod";;
               *) echo "Unknown branch $GARNIX_BRANCH"; exit 0;;
            esac

            export SOPS_AGE_KEY_FILE="$GARNIX_ACTION_PRIVATE_KEY_FILE"

            REGISTRY_AUTH_FILE="$(mktemp)"
            export REGISTRY_AUTH_FILE
            sops decrypt ${../secrets/auth.json} > "$REGISTRY_AUTH_FILE"

            echo "==== Deploying ${builtins.length nixChalls |> toString} nix challs"
            ${deployNixChalls}
          '';

          runtimeInputs = [
            pkgs.sops
            pkgs.skopeo
          ];
        };
    };
}
