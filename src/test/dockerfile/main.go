package main

import (
	"fmt"
	"net"
	"os"
)

func main() {
	flag := os.Getenv("FLAG")
	if flag == "" {
		flag = "gaslightCTF{test_flag}"
	}

	ln, err := net.Listen("tcp", ":1337")
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	for {
		conn, err := ln.Accept()
		if err != nil {
			continue
		}
		fmt.Fprintln(conn, flag)
		conn.Close()
	}
}
