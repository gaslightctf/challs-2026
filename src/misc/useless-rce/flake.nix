{
  description = "A very basic flake";
  inputs.haskellNix.url = "github:input-output-hk/haskell.nix";
  inputs.nixpkgs.follows = "haskellNix/nixpkgs-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";

  nixConfig = {
    extra-substituters = [ "https://cache.iog.io" ];
    extra-trusted-public-keys = [ "hydra.iohk.io:f/Ea+s+dFdN+3Y/G+FDgSq+a5NEWhJGzdjvKNGv0/EQ=" ];
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      haskellNix,
    }:
    flake-utils.lib.eachSystem [ "x86_64-linux" "aarch64-darwin" ] (
      system:
      let
        overlays = [
          haskellNix.overlay
          (final: _prev: {
            chall = final.haskell-nix.project' {
              src = ./.;
              compiler-nix-name = "ghc96";
              shell.tools = {
                cabal = { };
                haskell-language-server = { };
              };

              modules = [
                {
                  packages.chall.components.exes.chall = {
                    dontStrip = false;
                    dontPatchELF = false;
                  };
                }
              ];
            };
          })
        ];
        pkgs = import nixpkgs {
          inherit system overlays;
          inherit (haskellNix) config;
        };
        flake = pkgs.chall.flake { };

        chall = flake.packages."chall:exe:chall";
        wrapper = pkgs.writeShellApplication {
          name = "wrapper";
          text = ''
            mkdir -p /tmp
            cd "$(mktemp -d)"

            exec "${chall}/bin/chall"
          '';

          runtimeInputs = [
            pkgs.coreutils
          ];
        };
      in
      flake
      // {
        packages = {
          inherit chall wrapper;
          default = pkgs.dockerTools.streamLayeredImage {
            name = "useless-rce";

            config.Labels."org.opencontainers.image.source" = "https://github.com/gaslightctf/challs-2026";
            config.Env =
              let
                locales = pkgs.glibcLocales.override {
                  allLocales = false;
                  locales = [ "C.UTF-8/UTF-8" ];
                };
              in
              [
                "LANG=C.UTF-8"
                "LOCALE_ARCHIVE=${locales}/lib/locale/locale-archive"
              ];
            config.Cmd = [
              "${pkgs.socat}/bin/socat"
              "TCP-LISTEN:1337,reuseaddr,fork"
              "EXEC:\"${wrapper}/bin/wrapper\",pty,rawer,echo=0"
            ];
          };
        };
      }
    );
}
