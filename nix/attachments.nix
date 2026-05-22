{ self, ... }:
{
  perSystem =
    {
      pkgs,
      self',
      ...
    }:
    {
      packages.attachments =
        let
          challs =
            import ./_helpers/getChallenges.nix self
            |> builtins.filter (
              { src, ... }: (builtins.pathExists "${src}/attachments") || (builtins.pathExists "${src}/handout")
            )
            |> map (ctx: pkgs.callPackage ./_helpers/mkChallengeAttachments.nix ctx);
        in
        pkgs.symlinkJoin {
          name = "attachments";

          paths = challs;
        };

      apps.deploy-attachments.program =
        let
          deployScript = pkgs.writeScript "deployAttachments.ts" /* ts */ ''
            #!${pkgs.bun}/bin/bun

            ${builtins.readFile ./_helpers/deployAttachments.ts}
          '';
        in
        pkgs.writeShellApplication {
          name = "deploy-attachments";

          text = ''
            case "$GARNIX_BRANCH" in
               "master") S3_BUCKET="pantry-dev";;
               "prod") S3_BUCKET="pantry";;
               *) echo "Unknown branch $GARNIX_BRANCH"; exit 0;;
            esac
            export S3_BUCKET

            export SOPS_AGE_KEY_FILE="$GARNIX_ACTION_PRIVATE_KEY_FILE"

            sops exec-env ${../secrets/attachments.yaml} "${deployScript} ${self'.packages.attachments}"
          '';

          runtimeInputs = [
            pkgs.sops
          ];
        };
    };
}
