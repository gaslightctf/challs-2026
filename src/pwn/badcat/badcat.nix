{ stdenv, ... }:
stdenv.mkDerivation {
  name = "badcat";

  src = ./src;

  buildPhase = ''
    runHook preBuild

    gcc badcat.c -o badcat

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin
    cp badcat $out/bin

    runHook postInstall
  '';
}
