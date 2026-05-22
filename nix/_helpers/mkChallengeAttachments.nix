{
  stdenv,
  zstd,

  src,
  chall,

  ...
}:
let
  baseName = baseNameOf src;
in
stdenv.mkDerivation {
  name = "attachments-${chall}";

  inherit chall src baseName;

  nativeBuildInputs = [ zstd ];

  buildPhase = ''
    if [ ! -d "$src/attachments" ] && [ ! -d "$src/handout" ]; then
      echo "No attachments for $chall in $src"
      exit 0
    fi

    mkdir -p "$out/$baseName"

    if [ -d "$src/attachments" ]; then
      echo "Copying attachments for $chall"
      ln -s "$src/attachments"/* "$out/$baseName"
    fi

    if [ -d "$src/handout" ]; then
      echo "Compressing handout for $chall"
      cd "$src"
      tar -chaf "$out/$baseName/$chall.tar.zst" handout
    fi

    ls -l "$out/$baseName"
  '';
}
