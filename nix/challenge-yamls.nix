{ self, ... }:
{
  perSystem =
    { pkgs, ... }:
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
    };
}
