{
  dockerTools,
  openssh,

  bashInteractive,
  toybox,

  lib,
  callPackage,
  writeShellApplication,
}:
let
  openssh' = openssh.override {
    # force using libxcrypt otherwise the password auth doesn't work (?)
    linkOpenssl = false;
  };
  badcat = callPackage ./badcat.nix { };

  initsh = writeShellApplication {
    name = "initsh";

    text = ''
      ssh-keygen -A
      exec "$(which sshd)" -D -e
    '';

    runtimeInputs = [
      openssh'
    ];
  };
in
dockerTools.streamLayeredImage {
  name = "badcat";

  config.Labels."org.opencontainers.image.source" = "https://github.com/gaslightctf/challs-2026";
  config.Cmd = [ (lib.getExe initsh) ];

  contents = [
    bashInteractive
    toybox
  ];

  fakeRootCommands =
    # sh
    ''
      ${dockerTools.shadowSetup}
      useradd -U -m -s /bin/bash gaslighter
      chpasswd -c SHA512 <<<"gaslighter:b4788c115ea4eb42"
      echo '$ badcat README.txt' > /home/gaslighter/README.txt

      mkdir -p /etc/ssh
      echo "UsePAM no" > /etc/ssh/sshd_config
      echo "PermitRootLogin no" >> /etc/ssh/sshd_config
      echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config
      echo "Subsystem sftp ${openssh'}/libexec/sftp-server" >> /etc/ssh/sshd_config
      useradd -r -U -s /bin/false sshd
      mkdir -p /var/empty
      chmod 0755 /var/empty

      cat > /etc/profile <<EOF
        case "$TERM" in
            xterm-color|*-256color) color_prompt=yes;;
        esac
        if [ "$color_prompt" = yes ]; then
            PS1='\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '
        else
            PS1='\u@\h:\w\$ '
        fi
        unset color_prompt

        alias ll='ls -l'
        alias la='ls -A'
        alias l='ls -CF'
      EOF

      cp "${badcat}/bin/badcat" /bin/badcat
      chmod +s /bin/badcat
    '';
  enableFakechroot = true;
}
