{ stdenv, ... }:
stdenv.mkDerivation {
  name = "thirds";

  src = ./src;
  dontStrip = true;

  buildPhase = ''
    runHook preBuild

    gcc -w thirds.c -o thirds \
      -fstack-protector-all \
      -D_FORTIFY_SOURCE=0 \
      -O0

    runHook postBuild
  '';

  hardeningDisable = [ "all" ];

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin
    cp thirds $out/bin

    runHook postInstall
  '';
}
