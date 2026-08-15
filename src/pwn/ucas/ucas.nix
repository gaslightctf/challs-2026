{ stdenv, ... }:
stdenv.mkDerivation {
  name = "ucas";

  src = ./src;

  buildPhase = ''
    runHook preBuild

    gcc -w ucas.c -o ucas \
      -D_FORTIFY_SOURCE=0 \
      -O0

    runHook postBuild
  '';

  hardeningDisable = [ "bindnow" ];

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin
    cp ucas $out/bin

    runHook postInstall
  '';
}
