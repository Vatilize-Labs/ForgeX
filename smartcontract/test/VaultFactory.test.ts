import { expect } from "chai";
import { ethers } from "hardhat";
import { VaultFactory } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("VaultFactory - User Registration", function () {
  let factory: VaultFactory;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy VaultFactory
    const VaultFactoryFactory = await ethers.getContractFactory("VaultFactory");
    factory = await VaultFactoryFactory.deploy(owner.address);
    await factory.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("Should set correct constants", async function () {
      expect(await factory.MAX_USERNAME_LENGTH()).to.equal(20);
      expect(await factory.MAX_BIO_LENGTH()).to.equal(30);
    });
  });

  describe("User Registration", function () {
    const validUsername = "Alice";
    const validBio = "DeFi enthusiast";

    it("Should allow user to register with valid username and bio", async function () {
      await expect(factory.connect(user1).registerUser(validUsername, validBio))
        .to.emit(factory, "UserRegistered")
        .withArgs(user1.address, validUsername, await time.latest() + 1);

      expect(await factory.isUserRegistered(user1.address)).to.be.true;
    });

    it("Should store username correctly", async function () {
      await factory.connect(user1).registerUser(validUsername, validBio);
      expect(await factory.getUsername(user1.address)).to.equal(validUsername);
    });

    it("Should store bio correctly", async function () {
      await factory.connect(user1).registerUser(validUsername, validBio);
      expect(await factory.getBio(user1.address)).to.equal(validBio);
    });

    it("Should store registration timestamp", async function () {
      const tx = await factory.connect(user1).registerUser(validUsername, validBio);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      
      expect(await factory.getRegistrationTimestamp(user1.address)).to.equal(block!.timestamp);
    });

    it("Should return complete user info", async function () {
      await factory.connect(user1).registerUser(validUsername, validBio);
      const [username, bio, timestamp] = await factory.getUserInfo(user1.address);
      
      expect(username).to.equal(validUsername);
      expect(bio).to.equal(validBio);
      expect(timestamp).to.be.gt(0);
    });

    it("Should allow registration with empty bio", async function () {
      await expect(factory.connect(user1).registerUser(validUsername, ""))
        .to.emit(factory, "UserRegistered");

      expect(await factory.getBio(user1.address)).to.equal("");
    });

    it("Should allow multiple users to register", async function () {
      await factory.connect(user1).registerUser("Alice", "Bio1");
      await factory.connect(user2).registerUser("Bob", "Bio2");
      await factory.connect(user3).registerUser("Charlie", "Bio3");

      expect(await factory.isUserRegistered(user1.address)).to.be.true;
      expect(await factory.isUserRegistered(user2.address)).to.be.true;
      expect(await factory.isUserRegistered(user3.address)).to.be.true;

      expect(await factory.getUsername(user1.address)).to.equal("Alice");
      expect(await factory.getUsername(user2.address)).to.equal("Bob");
      expect(await factory.getUsername(user3.address)).to.equal("Charlie");
    });
  });

  describe("Username Validation", function () {
    it("Should revert on empty username", async function () {
      await expect(
        factory.connect(user1).registerUser("", "Valid bio")
      ).to.be.revertedWithCustomError(factory, "EmptyUsername");
    });

    it("Should accept username with exactly 20 characters", async function () {
      const username20 = "12345678901234567890"; // Exactly 20 chars
      await expect(factory.connect(user1).registerUser(username20, "Bio"))
        .to.emit(factory, "UserRegistered");
    });

    it("Should revert on username with 21 characters", async function () {
      const username21 = "123456789012345678901"; // 21 chars
      await expect(
        factory.connect(user1).registerUser(username21, "Bio")
      ).to.be.revertedWithCustomError(factory, "UsernameTooLong");
    });

    it("Should accept username with 1 character", async function () {
      await expect(factory.connect(user1).registerUser("A", "Bio"))
        .to.emit(factory, "UserRegistered");
    });

    it("Should handle special characters in username", async function () {
      await expect(factory.connect(user1).registerUser("Alice_123", "Bio"))
        .to.emit(factory, "UserRegistered");
    });

    it("Should handle unicode characters in username", async function () {
      await expect(factory.connect(user1).registerUser("Alice🚀", "Bio"))
        .to.emit(factory, "UserRegistered");
    });
  });

  describe("Bio Validation", function () {
    it("Should accept bio with exactly 30 characters", async function () {
      const bio30 = "123456789012345678901234567890"; // Exactly 30 chars
      await expect(factory.connect(user1).registerUser("Alice", bio30))
        .to.emit(factory, "UserRegistered");
    });

    it("Should revert on bio with 31 characters", async function () {
      const bio31 = "1234567890123456789012345678901"; // 31 chars
      await expect(
        factory.connect(user1).registerUser("Alice", bio31)
      ).to.be.revertedWithCustomError(factory, "BioTooLong");
    });

    it("Should accept empty bio", async function () {
      await expect(factory.connect(user1).registerUser("Alice", ""))
        .to.emit(factory, "UserRegistered");
    });

    it("Should handle special characters in bio", async function () {
      await expect(factory.connect(user1).registerUser("Alice", "DeFi & NFT lover!"))
        .to.emit(factory, "UserRegistered");
    });

    it("Should handle unicode characters in bio", async function () {
      await expect(factory.connect(user1).registerUser("Alice", "Crypto enthusiast 🚀"))
        .to.emit(factory, "UserRegistered");
    });
  });

  describe("Duplicate Registration", function () {
    const username = "Alice";
    const bio = "DeFi enthusiast";

    it("Should prevent duplicate registration", async function () {
      await factory.connect(user1).registerUser(username, bio);
      
      await expect(
        factory.connect(user1).registerUser("NewUsername", "NewBio")
      ).to.be.revertedWithCustomError(factory, "AlreadyRegistered");
    });

    it("Should not allow re-registration with same data", async function () {
      await factory.connect(user1).registerUser(username, bio);
      
      await expect(
        factory.connect(user1).registerUser(username, bio)
      ).to.be.revertedWithCustomError(factory, "AlreadyRegistered");
    });

    it("Should allow different users to use same username", async function () {
      await factory.connect(user1).registerUser(username, "Bio1");
      await expect(factory.connect(user2).registerUser(username, "Bio2"))
        .to.emit(factory, "UserRegistered");
    });
  });

  describe("View Functions", function () {
    const username = "Alice";
    const bio = "DeFi enthusiast";

    beforeEach(async function () {
      await factory.connect(user1).registerUser(username, bio);
    });

    describe("isUserRegistered", function () {
      it("Should return true for registered user", async function () {
        expect(await factory.isUserRegistered(user1.address)).to.be.true;
      });

      it("Should return false for unregistered user", async function () {
        expect(await factory.isUserRegistered(user2.address)).to.be.false;
      });
    });

    describe("getUserInfo", function () {
      it("Should return correct user info", async function () {
        const [returnedUsername, returnedBio, timestamp] = await factory.getUserInfo(user1.address);
        
        expect(returnedUsername).to.equal(username);
        expect(returnedBio).to.equal(bio);
        expect(timestamp).to.be.gt(0);
      });

      it("Should revert for unregistered user", async function () {
        await expect(
          factory.getUserInfo(user2.address)
        ).to.be.revertedWithCustomError(factory, "NotRegistered");
      });
    });

    describe("getUsername", function () {
      it("Should return correct username", async function () {
        expect(await factory.getUsername(user1.address)).to.equal(username);
      });

      it("Should revert for unregistered user", async function () {
        await expect(
          factory.getUsername(user2.address)
        ).to.be.revertedWithCustomError(factory, "NotRegistered");
      });
    });

    describe("getBio", function () {
      it("Should return correct bio", async function () {
        expect(await factory.getBio(user1.address)).to.equal(bio);
      });

      it("Should revert for unregistered user", async function () {
        await expect(
          factory.getBio(user2.address)
        ).to.be.revertedWithCustomError(factory, "NotRegistered");
      });
    });

    describe("getRegistrationTimestamp", function () {
      it("Should return valid timestamp", async function () {
        const timestamp = await factory.getRegistrationTimestamp(user1.address);
        expect(timestamp).to.be.gt(0);
      });

      it("Should revert for unregistered user", async function () {
        await expect(
          factory.getRegistrationTimestamp(user2.address)
        ).to.be.revertedWithCustomError(factory, "NotRegistered");
      });
    });
  });

  describe("Events", function () {
    it("Should emit UserRegistered event with correct parameters", async function () {
      const username = "Alice";
      const bio = "DeFi enthusiast";
      
      const tx = await factory.connect(user1).registerUser(username, bio);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(factory, "UserRegistered")
        .withArgs(user1.address, username, block!.timestamp);
    });

    it("Should emit event for each registration", async function () {
      await expect(factory.connect(user1).registerUser("Alice", "Bio1"))
        .to.emit(factory, "UserRegistered");
      
      await expect(factory.connect(user2).registerUser("Bob", "Bio2"))
        .to.emit(factory, "UserRegistered");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very long valid username (20 chars)", async function () {
      const longUsername = "a".repeat(20);
      await expect(factory.connect(user1).registerUser(longUsername, "Bio"))
        .to.emit(factory, "UserRegistered");
    });

    it("Should handle very long valid bio (30 chars)", async function () {
      const longBio = "b".repeat(30);
      await expect(factory.connect(user1).registerUser("Alice", longBio))
        .to.emit(factory, "UserRegistered");
    });

    it("Should handle registration with whitespace in username", async function () {
      await expect(factory.connect(user1).registerUser("Alice Smith", "Bio"))
        .to.emit(factory, "UserRegistered");
    });

    it("Should handle registration with whitespace in bio", async function () {
      await expect(factory.connect(user1).registerUser("Alice", "DeFi enthusiast"))
        .to.emit(factory, "UserRegistered");
    });

    it("Should handle multiple registrations in same block", async function () {
      // This tests that timestamps are correctly set even for same-block registrations
      await factory.connect(user1).registerUser("Alice", "Bio1");
      await factory.connect(user2).registerUser("Bob", "Bio2");

      const timestamp1 = await factory.getRegistrationTimestamp(user1.address);
      const timestamp2 = await factory.getRegistrationTimestamp(user2.address);

      expect(timestamp1).to.be.gt(0);
      expect(timestamp2).to.be.gt(0);
    });
  });

  describe("Gas Optimization", function () {
    it("Should use custom errors for gas efficiency", async function () {
      // Custom errors are more gas efficient than require strings
      // This test verifies they are being used
      await factory.connect(user1).registerUser("Alice", "Bio");
      
      try {
        await factory.connect(user1).registerUser("Bob", "Bio2");
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("AlreadyRegistered");
      }
    });
  });
});
