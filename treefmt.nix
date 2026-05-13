{
  perSystem =
    { ... }:
    {
      treefmt = {
        programs.nixfmt.enable = true;

        programs.prettier = {
          enable = true;
          includes = [
            "*.md"
            "*.js"
            "*.json"
            "*.yaml"
          ];

          settings = {
            tabWidth = 2;
            printWidth = 100;
          };
        };
      };
    };
}
