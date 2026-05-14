{
  stdenv,
  writeScript,
  yq,
  bun,

  src,
  targetEnv ? "dev",
}:
let
  baseName = baseNameOf src;

  builder = writeScript "mkChallengeYaml.js" /* js */ ''
    #!${bun}/bin/bun

    ${builtins.readFile ./mkChallengeYaml.js}
  '';
in
stdenv.mkDerivation {
  name = "mkChallengeYaml-${baseName}";

  inherit src targetEnv baseName;

  buildPhase = ''
    runHook preBuild

    mkdir -p $out
    ${builder} | ${yq}/bin/yq -y '.' > $out/${baseName}.yaml

    runHook postBuild
  '';
}
