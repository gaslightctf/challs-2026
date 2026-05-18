{ self, ... }:
{
  perSystem =
    { pkgs, self', ... }:
    {
      packages.challenge-yamls =
        let
          challs =
            import ./_helpers/getChallenges.nix self
            |> map (ctx: pkgs.callPackage ./_helpers/mkChallengeYaml.nix ctx);
        in
        pkgs.symlinkJoin {
          name = "challenge-yamls";

          paths = challs;
        };

      apps.deploy-challenge-yamls.program = pkgs.writeShellApplication {
        name = "deploy-challenge-yamls";
        text = ''
          case "$GARNIX_BRANCH" in
             "master") TARGET_ENV="dev";;
             "prod") TARGET_ENV="prod";;
             *) echo "Unknown branch $GARNIX_BRANCH"; exit 0;;
          esac

          export SOPS_AGE_KEY_FILE="$GARNIX_ACTION_PRIVATE_KEY_FILE"
          GH_USERNAME="$(sops decrypt ${../secrets/github.yaml} --extract '["GH_USERNAME"]')"
          GH_PAT="$(sops decrypt ${../secrets/github.yaml} --extract '["GH_PAT"]')"

          git config --global user.name "gaslightCTF CI"
          git config --global user.email "ci@gaslightctf.cooking"

          cd "$(mktemp -d)"
          git clone "https://$GH_USERNAME:$GH_PAT@github.com/gaslightctf/challs-2026-manifests.git" --depth 1 --branch "$TARGET_ENV"
          cd challs-2026-manifests

          git ls-files -z | xargs -0 rm -f
          cp -RL "${self'.packages.challenge-yamls}/" .

          git add .
          git commit -m "Update to $GARNIX_COMMIT_SHA ($GARNIX_BRANCH)"
          git push
        '';

        runtimeInputs = [
          pkgs.sops
        ];
      };
    };
}
