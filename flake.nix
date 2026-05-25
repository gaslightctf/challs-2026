{
  description = "gaslightCTF 2026 challenges";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    import-tree.url = "github:vic/import-tree";

    treefmt.url = "github:numtide/treefmt-nix";
    treefmt.inputs.nixpkgs.follows = "nixpkgs";

    devshell.url = "github:numtide/devshell";
    devshell.inputs.nixpkgs.follows = "nixpkgs";
  };

  nixConfig = {
    extra-substituters = [
      "https://cache.nixos.org"
      "https://nix-community.cachix.org"
      "https://cache.garnix.io"
    ];
    extra-trusted-public-keys = [
      "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY="
      "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
      "cache.garnix.io:CTFPyKSLcx5RMJKfLo5EEPUObbA78b0YQ2DTCJXqr9g="
    ];
  };

  outputs =
    inputs@{ flake-parts, import-tree, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];

      imports = [
        inputs.devshell.flakeModule

        inputs.treefmt.flakeModule
        ./treefmt.nix

        (import-tree ./nix)
      ];

      perSystem =
        { pkgs, ... }:
        {
          devshells.default = {
            commands = [
              {
                package = pkgs.sops;
                category = "deploy";
              }
              {
                package = pkgs.skopeo;
                category = "deploy";
              }

              {
                package = pkgs.nix-tree;
                category = "build";
              }
              {
                package = pkgs.buildah;
                category = "build";
              }
              {
                name = "callPackage";
                help = "CLI version of pkgs.callPackage";
                category = "build";
                command = ''
                  ${pkgs.nix-output-monitor}/bin/nom build --impure --print-out-paths --expr \
                    "(import ${inputs.nixpkgs} { system = \"x86_64-linux\"; }).callPackage $1 {}"
                '';
              }

              {
                package = pkgs.python3.withPackages (
                  ps: with ps; [
                    pwntools
                    z3-solver
                  ]
                );
                category = "ctf";
              }
            ];
          };
        };
    };
}
