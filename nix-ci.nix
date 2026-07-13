{
  onlyBuild = [
    "packages.x86_64-linux.challenge-yamls"
    "packages.x86_64-linux.attachments"
  ];

  deploy =
    builtins.mapAttrs
      (n: secret: {
        package = "packages.x86_64-linux.${n}";
        branches = [
          "master"
          "prod"
        ];
        secrets = [ secret ];
      })
      {
        deploy-attachments = "DEPLOY_ATTACHMENTS_AGE_KEY";
        deploy-challenge-yamls = "DEPLOY_CHALLENGE_AGE_KEY";
        deploy-ghcr = "DEPLOY_GHCR_AGE_KEY";
      };
}
