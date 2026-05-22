{ self, ... }:
{
  perSystem =
    {
      pkgs,
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
    };
}
