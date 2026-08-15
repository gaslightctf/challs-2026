{ stdenv, ... }:
stdenv.mkDerivation {
  name = "good-enough";

  src = ./src;
  dontStrip = true;

  buildPhase = ''
    runHook preBuild

    gcc -w gutgenug.c -o good-enough \
      -D_FORTIFY_SOURCE=0 \
      -O0

    runHook postBuild
  '';

  hardeningDisable = [ "all" ];

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin
    cp good-enough $out/bin

    runHook postInstall
  '';
}
