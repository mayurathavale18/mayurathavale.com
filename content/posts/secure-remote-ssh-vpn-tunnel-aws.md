---
title: "A Secure Way to Remotely SSH Into Your Devices Through a VPN Tunnel Self-Hosted on AWS"
date: 2025-10-03
description: "How I set up a self-hosted WireGuard VPN on AWS EC2 to remotely SSH into my devices from anywhere, bypassing CG-NAT and ISP restrictions."
tags: ["ssh", "vpn", "wireguard", "aws", "networking", "linux"]
externalURL: "https://mayatdev1569.medium.com/a-secure-way-to-remotely-ssh-into-your-devices-through-a-vpn-tunnel-self-hosted-on-aws-a8c6f0059042"
---

![self-hosted wireguard VPN tunnel demo](https://cdn-images-1.medium.com/max/800/1*r4-cMOzeZsRIleDqIQRRTA.gif)
*Self-hosted WireGuard VPN tunnel demo*

I was always fascinated by the fact that using a simple command like `ssh host@ip` one can get access into their host system. I gained more interest in this way of remotely accessing your devices and was also inspired to write this article after I read this [medium article](https://medium.com/@kaustubhpatange/standing-out-with-terminal-based-ssh-portfolio-aa7b6a2eb1ad) about a terminal based SSH portfolio by Kaustubh Patange (do give it a read).

So I went on and edited the ssh configs on my android using [termux](https://github.com/termux/termux-app), with my hostname as my target device's username and vice versa, and I kept accessing my devices for either executing some quick commands like merging a PR or running a workflow or transferring resources quickly over ssh with either scp (the old way) or rsync (the rsync way).

But here was the catch: With this approach, there were a couple of changes I frequently had to manually make and ensure certain conditions are met:

1. Make sure that both of my devices are on the same network.
2. Keep updating host IP from the network in the `.ssh/config` on both of my devices (because I usually had to connect both ways).

## The Problem: CG-NAT and ISP Restrictions

I started exploring ways in which I could access my device remotely without being in the same network. I knew that it was possible with port forwarding from the network router to my device's port, **but** the networks I was mostly connected to were either **my office wifi** or **my home wifi** which I could not do anything about.

![snapshot of NAT table entry for port forwarding in my ISP's portal](https://cdn-images-1.medium.com/max/1024/1*ed7TJuIbMExEZbM6gsSdMQ.png)
*NAT table entry for port forwarding in my ISP's portal*

Unfortunately, my ISP is Airtel (the broadband I use is *Airtel air fibre*, meaning it's just a sim card sitting in a booster circuit). No matter what I did, the forwarded traffic would never reach my router due to [**CG-NAT**](https://en.wikipedia.org/wiki/Carrier-grade_NAT) (Carrier Grade NAT). ISPs like Airtel and Jio usually block inbound traffic on port 22 for residential customers, so packets were dropped silently at the top layer.

## The Solution: Self-Hosted WireGuard VPN on AWS

I needed a router available from anywhere with a static public IP. So I spun up an EC2 instance in my AWS free tier account and found [WireGuard](https://www.wireguard.com/) — a fast, lean, and easy to configure VPN.

The architecture is simple: The VPN server runs on the EC2 instance. When we SSH into the EC2 instance on a port, packets are looked up in the NAT table and forwarded through the WireGuard subnet to our target device via a secured & private tunnel.

```bash
ssh -p <port> -i <private_key_path> hostname@<static_public_ip_of_ec2_machine>
```

### Setting Up the Remote EC2 Server

I'm using AWS's EC2 `t3.micro` instance with 8GB SSD storage (available in the free tier). Once your instance is created and launched, configure the security groups:

![Default + Added Security Group inbound rules](https://cdn-images-1.medium.com/max/1024/1*Uj-1TdE1LaJNNBHz9j3bCA.png)
*Security Group inbound rules*

The three rules:
1. Allow WireGuard daemon to collect packets from the target device's client
2. Accept SSH traffic from your client device on port 2222
3. Allow login to the EC2 instance from anywhere with your private key

### Getting an Elastic IP

AWS provides **Elastic IP** which assigns your instance a public IP that doesn't change when you restart the instance. Find it under **Networking and Security > Elastic IPs** and allocate one.

### Installing WireGuard

```bash
$ sudo apt install wireguard -y
```

Generate the server-side key pair:

```bash
wg genkey | tee server_private.key | wg pubkey > server_public.key
```

Configure the WireGuard server:

```ini
# /etc/wireguard/wg0.conf
[Interface]
PrivateKey = <server_private.key>
Address = 10.0.0.1/24
MTU = 1420

[Peer]
PublicKey = <client_public.key>
AllowedIPs = 10.0.0.2/32
```

Enable IP forwarding:

```bash
sudo sysctl -w net.ipv4.ip_forward=1
```

### Running the VPN Service

```bash
# Start the service
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0

# Stop the service
sudo wg-quick down wg0
```

### Target Device Configuration

Generate keys on the target device and configure WireGuard:

```bash
wg genkey | tee target_private.key | wg pubkey > target_public.key
```

```ini
# /etc/wireguard/wg0.conf on target device
[Interface]
PrivateKey = <target_private.key>
Address = 10.0.0.2/24
MTU = 1420

[Peer]
PublicKey = <server_public_key>
Endpoint = <EC2_instance_elastic_ip:52810>
AllowedIPs = 10.0.0.0/24
PersistentKeepalive = 25
```

### Setting Up NAT Rules

**DNAT rule (PREROUTING)** — forward incoming TCP traffic on port 2222 to the WireGuard subnet:

```bash
sudo iptables -t nat -A PREROUTING -d <EC2_elastic_public_ip> -p tcp --dport 2222 -j DNAT --to-destination 10.0.0.2:22
```

**SNAT rule (POSTROUTING)** — re-assign source IP for packets going through the tunnel:

```bash
sudo iptables -t nat -A POSTROUTING -d 10.0.0.2 -p tcp --dport 22 -j SNAT --to-source 10.0.0.1
```

### Securing the Target Device

```bash
# in /etc/ssh/sshd_config of target device
PubkeyAuthentication yes
PasswordAuthentication no
PermitEmptyPasswords no
PermitRootLogin no
AllowUsers <user_name_of_source_device>
```

```bash
sudo systemctl restart ssh
```

Generate an ED25519 key pair from your source device:

```bash
ssh-keygen -t ed25519 -f ~/target_device_access_key
```

### Testing

Check the VPN tunnel status:

```bash
sudo wg show
```

Expected output:

```
interface: wg0
  public key: <pub_key_of_target_device>
  private key: (hidden)
  listening port: 45859

peer: <pub_key_of_ec2_instance>
  endpoint: <ec2_elastic_pub_ip>:52180
  allowed ips: 10.0.0.0/24
  latest handshake: 11 seconds ago
  transfer: 92 B received, 476 B sent
  persistent keepalive: every 25 seconds
```

Verify connectivity:

```bash
# from EC2 server
ping 10.0.0.1

# from target device
ping 10.0.0.2
```

### Troubleshooting

If ping from server to target device is timing out, use `tcpdump` to inspect traffic:

```bash
# on client
sudo tcpdump -i wg0 -n 'port 22'

# on server
sudo tcpdump -i ens5 port 2222 -n
```

Ensure IP forwarding is enabled:

```bash
sudo sysctl net.ipv4.ip_forward  # output should be 1
```

## Final Tips

1. Open a tmux session on your server and run the WireGuard service
2. Use aliases for WireGuard-related commands
3. Save SSH connections in `~/.ssh/config` for quick access
4. Add a custom terminal prompt indicator for active VPN connections

![Custom terminal prompt indicating successful tunnel connection](https://cdn-images-1.medium.com/max/1024/1*p4o0txOovF5MyMxW5YEeMg.png)
*Custom terminal prompt indicating the successful tunnel connection*

All config samples, my oh-my-posh custom terminal prompt config and WireGuard aliases are available in my GitHub repo: [wg-vpn-tunnel-resources](https://github.com/mayurathavale18/wg-vpn-tunnel-resources).

---

*Originally published on [Medium](https://mayatdev1569.medium.com/a-secure-way-to-remotely-ssh-into-your-devices-through-a-vpn-tunnel-self-hosted-on-aws-a8c6f0059042).*
