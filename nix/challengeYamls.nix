{ self, ... }:
{
  perSystem =
    { pkgs, ... }:
    {
      packages.challengeYamls =
        let
          challs =
            builtins.readDir "${self}/src"
            |> builtins.attrNames
            |> builtins.concatMap (
              category:
              (
                builtins.readDir "${self}/src/${category}"
                |> builtins.attrNames
                |> map (chall: builtins.path { path = "${self}/src/${category}/${chall}"; })
              )
            )
            |> map (src: pkgs.callPackage ./helpers/mkChallengeYaml.nix { inherit src; });
        in
        pkgs.symlinkJoin {
          name = "challenge-yamls";

          paths = challs;
        };
    };
}
