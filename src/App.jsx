import { useState } from 'react';
import { ethers } from 'ethers';
import * as snarkjs from 'snarkjs';

function App() {
  const [birthYear, setBirthYear] = useState('');
  const [proof, setProof] = useState(null);
  const [publicSignals, setPublicSignals] = useState(null);
  const [status, setStatus] = useState('');
  const currentYear = 2025;
  const thresholdYear = currentYear - 18;

  const generateProof = async () => {
    try {
      setStatus('Generating proof...');
      if (!birthYear || isNaN(parseInt(birthYear)) || parseInt(birthYear) > currentYear) {
        throw new Error('Please enter a valid birth year');
      }
      const input = {
        birthYear: parseInt(birthYear),
        currentYear: currentYear,
        thresholdYear: thresholdYear
      };
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        '/circuit.wasm',
        '/circuit_final.zkey'
      );
      console.log('Raw Proof:', JSON.stringify(proof, null, 2));
      console.log('Raw Public Signals:', JSON.stringify(publicSignals, null, 2));
      setProof(proof);
      setPublicSignals(publicSignals);
      setStatus('Proof generated!');
    } catch (error) {
      console.error('Proof generation error:', error);
      setStatus('Error generating proof: ' + error.message);
    }
  };

  const verifyProof = async () => {
    try {
      setStatus('Verifying proof...');
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }
      if (!proof || !publicSignals) {
        throw new Error('Proof or public signals not generated');
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const contractAddress = '0x54e6329b3865359c374f3af7090f8292f3e63e67'; // Replace with deployed address
      const contractABI =[
        {
          "inputs": [
            {
              "internalType": "uint256[2]",
              "name": "_pA",
              "type": "uint256[2]"
            },
            {
              "internalType": "uint256[2][2]",
              "name": "_pB",
              "type": "uint256[2][2]"
            },
            {
              "internalType": "uint256[2]",
              "name": "_pC",
              "type": "uint256[2]"
            },
            {
              "internalType": "uint256[3]",
              "name": "_pubSignals",
              "type": "uint256[3]"
            }
          ],
          "name": "verifyProof",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ];
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      // Validate proof structure
      if (!proof.pi_a || !Array.isArray(proof.pi_a) || proof.pi_a.length < 2) {
        throw new Error(`Invalid pi_a structure: ${JSON.stringify(proof.pi_a)}`);
      }
      if (!proof.pi_b || !Array.isArray(proof.pi_b) || proof.pi_b.length < 2 || 
          !Array.isArray(proof.pi_b[0]) || proof.pi_b[0].length < 2 ||
          !Array.isArray(proof.pi_b[1]) || proof.pi_b[1].length < 2) {
        throw new Error(`Invalid pi_b structure: ${JSON.stringify(proof.pi_b)}`);
      }
      if (!proof.pi_c || !Array.isArray(proof.pi_c) || proof.pi_c.length < 2) {
        throw new Error(`Invalid pi_c structure: ${JSON.stringify(proof.pi_c)}`);
      }
      if (!Array.isArray(publicSignals) || publicSignals.length !== 3) {
        throw new Error(`Invalid publicSignals structure: ${JSON.stringify(publicSignals)}`);
      }
      const a = [proof.pi_a[0], proof.pi_a[1]]; // uint256[2] for _pA
      const b = [
        [proof.pi_b[0][1], proof.pi_b[0][0]], // uint256[2][2] for _pB: Swap [x1, x2] -> [x2, x1]
        [proof.pi_b[1][1], proof.pi_b[1][0]]  // Swap [y1, y2] -> [y2, y1]
      ];
      const c = [proof.pi_c[0], proof.pi_c[1]]; // uint256[2] for _pC
      const input = [publicSignals[0], publicSignals[1], publicSignals[2]]; // uint256[3] for _pubSignals
      console.log('Formatted verifyProof arguments:', JSON.stringify({ a, b, c, input }, null, 2));
      const iface = new ethers.Interface(contractABI);
      const encodedData = iface.encodeFunctionData('verifyProof', [a, b, c, input]);
      console.log('Encoded call data:', encodedData);
      const result = await contract.verifyProof(a, b, c, input);
      console.log('verifyProof result:', result);
      setStatus(result ? 'Proof verified! You are 18 or older.' : 'Proof invalid');
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('Error verifying proof: ' + error.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">ZKP Age Verifier</h1>
      <div className="bg-white p-6 rounded shadow-md w-96">
        <input
          type="number"
          placeholder="Enter birth year"
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />
        <button
          onClick={generateProof}
          className="w-full bg-blue-500 text-white p-2 rounded mb-2 hover:bg-blue-600"
        >
          Generate Proof
        </button>
        <button
          onClick={verifyProof}
          disabled={!proof}
          className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          Verify Proof
        </button>
        <p className="mt-4 text-sm text-gray-600">{status}</p>
      </div>
    </div>
  );
}

export default App;