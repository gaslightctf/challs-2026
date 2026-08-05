{ self, ... }:
let
  CONTAINER_REGISTRY = "ghcr.io/gaslightctf/challs-2026";
in
{
  perSystem =
    { pkgs, system, ... }:
    {
      packages.deploy-ghcr =
        let
          challs = import ./_helpers/getChallenges.nix self;

          nixChalls =
            challs
            |> builtins.filter (
              { src, ... }: builtins.pathExists "${src}/default.nix" || builtins.pathExists "${src}/flake.nix"
            );
          deployNixChalls =
            nixChalls
            |> map (
              { chall, src, ... }:
              # bash
              ''
                echo "== Deploying ${chall} to ${CONTAINER_REGISTRY}/${chall}:$TARGET_ENV"
                challImage="$(mktemp)"
                "${
                  if builtins.pathExists "${src}/default.nix" then
                    pkgs.callPackage "${src}/default.nix" { }
                  else
                    (builtins.getFlake src).packages.${system}.default
                }" > "$challImage"
                skopeo copy \
                  --insecure-policy \
                  --authfile "$AUTH_FILE" \
                  "docker-archive:$challImage" \
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
            case "$NIX_CI_GIT_BRANCH" in
               "master") TARGET_ENV="dev";;
               "prod") TARGET_ENV="prod";;
               *) echo "Unknown branch $NIX_CI_GIT_BRANCH"; exit 0;;
            esac

            export SOPS_AGE_KEY="$DEPLOY_GHCR_AGE_KEY"
            GH_USERNAME="$(sops decrypt ${../secrets/github.yaml} --extract '["GH_USERNAME"]')"
            GH_PAT="$(sops decrypt ${../secrets/github.yaml} --extract '["GH_PAT"]')"
            AUTH_FILE="$(mktemp -u)"
            skopeo login ghcr.io --authfile "$AUTH_FILE" -u "$GH_USERNAME" -p "$GH_PAT"

            echo "==== Deploying ${builtins.length nixChalls |> toString} nix challs"
            ${deployNixChalls}

            rm "$AUTH_FILE"
          '';

          runtimeInputs = [
            pkgs.sops
            pkgs.skopeo
            pkgs.toybox
          ];
        };
    };
}
