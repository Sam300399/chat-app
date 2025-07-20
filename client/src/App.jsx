// src/App.jsx
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("https://chat-app-c6et.onrender.com");
const ROOM_ID = "demo-room"; // hard‑coded; you can make this dynamic

export default function App() {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);

  const pcRef = useRef(null); // RTCPeerConnection
  const [joined, setJoined] = useState(false);

  // 1️⃣  Join the room & get media
  const joinRoom = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localVideo.current.srcObject = stream;

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" },{
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }],
      });
      pcRef.current = pc;

      // Send any ice candidates to peer
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("ice", { room: ROOM_ID, candidate: e.candidate });
        }
      };

      // When remote stream arrives, show it
      pc.ontrack = (e) => {
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = e.streams[0];
        }
      };

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Join signalling room
      socket.emit("join_room", ROOM_ID);
      setJoined(true);
    } catch (err) {
      console.error(err);
      alert("Could not access camera / microphone");
    }
  };

  // 2️⃣  Signalling handlers
  useEffect(() => {
    // another peer says “I’m ready”
    socket.on("ready", async () => {
      if (!pcRef.current) return;
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socket.emit("offer", { room: ROOM_ID, sdp: offer });
    });

    // receive offer
    socket.on("offer", async (sdp) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(sdp);
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("answer", { room: ROOM_ID, sdp: answer });
    });

    // receive answer
    socket.on("answer", async (sdp) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(sdp);
    });

    // receive ICE
    socket.on("ice", async (candidate) => {
      try {
        await pcRef.current?.addIceCandidate(candidate);
      } catch (err) {
        console.error("Error adding ice", err);
      }
    });

    // cleanup
    return () => {
      socket.off("ready");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice");
    };
  }, []);

  // 3️⃣  Simple UI
  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">React + Socket.IO Video Chat</h1>

      {!joined && (
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow"
          onClick={joinRoom}
        >
          Join call
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
        <video
          ref={localVideo}
          autoPlay
          playsInline
          muted
          className="w-full rounded-xl shadow"
        />
        <video
          ref={remoteVideo}
          autoPlay
          playsInline
          className="w-full rounded-xl shadow"
        />
      </div>
    </div>
  );
}
