{ self, ... }:
{
  perSystem =
    { pkgs, self', ... }:
    {
      packages.challenge-yamls =
        let
          challs =
            import ./_helpers/getChallenges.nix self
            |> builtins.filter ({ src, ... }: builtins.pathExists "${src}/chall.yaml")
            |> map (ctx: pkgs.callPackage ./_helpers/mkChallengeYaml.nix ctx);
        in
        pkgs.symlinkJoin {
          name = "challenge-yamls";

          paths = challs;
        };

      packages.deploy-challenge-yamls = pkgs.writeShellApplication {
        name = "deploy-challenge-yamls";
        text = ''
          case "$NIX_CI_GIT_BRANCH" in
             "master") TARGET_ENV="dev";;
             "prod") TARGET_ENV="prod";;
             *) echo "Unknown branch $NIX_CI_GIT_BRANCH"; exit 0;;
          esac

          export SOPS_AGE_KEY="$DEPLOY_CHALLENGE_AGE_KEY"
          GH_USERNAME="$(sops decrypt ${../secrets/github.yaml} --extract '["GH_USERNAME"]')"
          GH_PAT="$(sops decrypt ${../secrets/github.yaml} --extract '["GH_PAT"]')"

          git config --global user.name "gaslightCTF CI"
          git config --global user.email "ci@gaslightctf.cooking"

          cd "$(mktemp -d)"
          git clone "https://$GH_USERNAME:$GH_PAT@github.com/gaslightctf/challs-2026-manifests.git" --depth 1 --branch "$TARGET_ENV"
          cd challs-2026-manifests

          git ls-files -z | xargs -0 rm -f
          cp -L "${self'.packages.challenge-yamls}"/* .

          if [ "$TARGET_ENV" = "prod" ]; then
            sed -i 's|https://pantry-dev\.gaslightctf\.cooking|https://pantry.gaslightctf.cooking|g' ./*.yaml
          fi

          git add .
          if ! git diff --cached --quiet; then
            git commit -m "Update to $NIX_CI_GIT_COMMIT_SHA ($NIX_CI_GIT_BRANCH)"
            git push
          else
            echo "No changes to deploy"
          fi
        '';

        runtimeInputs = [
          pkgs.sops
          pkgs.toybox
        ];
      };
    };
}
