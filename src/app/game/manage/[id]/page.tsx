"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useAuth } from "../../../components/providers";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import { useUploadThing } from "@/lib/uploadthing-client";
import { ImageUpload } from "@/components/upload";
import { Playback } from "@/components/playback";

export default function GameManagePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const gameId = params.id as Id<"games">;

  const game = useQuery(api.games.getGame, { gameId });
  const players = useQuery(api.players.getGamePlayers, { gameId });
  const assets = useQuery(api.assets.getGameAssets, { gameId });
  const entries = useQuery(api.entries.getGameEntries, { gameId });

  const openLobby = useMutation(api.games.openLobby);
  const startGame = useMutation(api.games.startGame);
  const endGame = useMutation(api.games.endGame);
  const finishGame = useMutation(api.games.finishGame);
  const addAsset = useMutation(api.assets.addAsset);
  const removeAsset = useMutation(api.assets.removeAsset);
  const updateGame = useMutation(api.games.updateGame);
  const deleteGame = useMutation(api.games.deleteGame);
  const resetGame = useMutation(api.games.resetGame);

  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetType, setNewAssetType] = useState<"image" | "font" | "other">(
    "image",
  );
  const [isUploading, setIsUploading] = useState(false);
  const assetFileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload: startAssetUpload } = useUploadThing("gameAsset", {
    onClientUploadComplete: (res) => {
      if (res?.[0]?.url) {
        handleAssetUploaded(res[0].url);
      }
      setIsUploading(false);
    },
    onUploadError: (error) => {
      alert(`Upload failed: ${error.message}`);
      setIsUploading(false);
    },
  });

  // Playback state
  const [playbackEntry, setPlaybackEntry] = useState<{
    id: Id<"entries">;
    playerName: string;
    autoPlay?: boolean;
  } | null>(null);

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset state
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editReferenceImageUrl, setEditReferenceImageUrl] = useState("");
  const [editHexColors, setEditHexColors] = useState<
    { name: string; hex: string }[]
  >([]);
  const [editRequirements, setEditRequirements] = useState("");
  const [editDuration, setEditDuration] = useState(15);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize edit form when game loads or edit mode is entered
  useEffect(() => {
    if (game && isEditing) {
      setEditTitle(game.title);
      setEditDescription(game.description);
      setEditReferenceImageUrl(game.referenceImageUrl);
      setEditHexColors(
        game.hexColors.length > 0
          ? [...game.hexColors]
          : [{ name: "", hex: "" }],
      );
      setEditRequirements(game.requirements || "");
      setEditDuration(game.durationMinutes);
    }
  }, [game, isEditing]);

  const canEdit = game?.status === "draft" || game?.status === "lobby";

  if (game === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  if (game === null || isDeleting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          {isDeleting ? (
            <>
              <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-4">Deleting Game...</h1>
              <p className="text-gray-400">
                Removing all data and uploaded files
              </p>
            </>
          ) : (
            <>
              <svg
                className="w-16 h-16 text-gray-600 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h1 className="text-2xl font-bold mb-2">Game Not Found</h1>
              <p className="text-gray-400 mb-6">
                This game may have been deleted or doesn&apos;t exist.
              </p>
              <Link
                href="/"
                className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg inline-block"
              >
                Go Home
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  // Check if user is the creator
  if (user?.id !== game.creatorId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">
            Only the game creator can manage this game.
          </p>
          <Link
            href={`/game/${game.shortCode}`}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg"
          >
            Go to Lobby
          </Link>
        </div>
      </div>
    );
  }

  const handleAssetUploaded = async (url: string) => {
    if (!newAssetName.trim()) {
      alert("Please enter an asset name first");
      return;
    }

    await addAsset({
      gameId,
      name: newAssetName.trim(),
      url,
      type: newAssetType,
    });

    setNewAssetName("");
    // Reset file input
    if (assetFileInputRef.current) {
      assetFileInputRef.current.value = "";
    }
  };

  const handleAssetFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!newAssetName.trim()) {
      alert("Please enter an asset name first");
      if (assetFileInputRef.current) {
        assetFileInputRef.current.value = "";
      }
      return;
    }

    setIsUploading(true);
    await startAssetUpload([file]);
  };

  // Edit mode handlers
  const handleSaveChanges = async () => {
    if (!user?.id) return;
    if (
      !editTitle.trim() ||
      !editDescription.trim() ||
      !editReferenceImageUrl
    ) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      await updateGame({
        gameId,
        creatorId: user.id as Id<"users">,
        title: editTitle.trim(),
        description: editDescription.trim(),
        referenceImageUrl: editReferenceImageUrl,
        hexColors: editHexColors.filter(
          (c) => c.name.trim() !== "" && c.hex.trim() !== "",
        ),
        requirements: editRequirements.trim() || undefined,
        durationMinutes: editDuration,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const addColor = () =>
    setEditHexColors([...editHexColors, { name: "", hex: "" }]);
  const updateColorName = (index: number, name: string) => {
    const newColors = [...editHexColors];
    const color = newColors[index];
    if (color) {
      newColors[index] = { ...color, name };
      setEditHexColors(newColors);
    }
  };
  const updateColorHex = (index: number, hex: string) => {
    const newColors = [...editHexColors];
    const color = newColors[index];
    if (color) {
      newColors[index] = { ...color, hex };
      setEditHexColors(newColors);
    }
  };
  const removeColor = (index: number) => {
    setEditHexColors(editHexColors.filter((_, i) => i !== index));
  };

  const handleOpenLobby = async () => {
    if (!user?.id) return;
    await openLobby({ gameId, creatorId: user.id as Id<"users"> });
  };

  const handleStartGame = async () => {
    if (!user?.id) return;
    await startGame({ gameId, creatorId: user.id as Id<"users"> });
  };

  const handleEndGame = async () => {
    if (!user?.id) return;
    await endGame({ gameId, creatorId: user.id as Id<"users"> });
    router.push(`/results/${game.shortCode}`);
  };

  const handleFinishGame = async () => {
    if (!user?.id) return;
    await finishGame({ gameId, creatorId: user.id as Id<"users"> });
  };

  const handleDeleteGame = async () => {
    if (!user?.id) return;

    setIsDeleting(true);
    try {
      // Delete from Convex and get asset URLs
      const result = await deleteGame({
        gameId,
        creatorId: user.id as Id<"users">,
      });

      // Delete files from UploadThing
      if (result.deletedAssetUrls.length > 0) {
        await fetch("/api/uploadthing/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: result.deletedAssetUrls }),
        });
      }

      router.push("/");
    } catch (error) {
      console.error("Failed to delete game:", error);
      alert("Failed to delete game");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleResetGame = async () => {
    if (!user?.id) return;

    setIsResetting(true);
    try {
      await resetGame({
        gameId,
        creatorId: user.id as Id<"users">,
      });
      setShowResetConfirm(false);
    } catch (error) {
      console.error("Failed to reset game:", error);
      alert("Failed to reset game");
    } finally {
      setIsResetting(false);
    }
  };

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/game/${game.shortCode}`
      : "";

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="border-b-4 border-[#3a9364] bg-[#0a0a12] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-['Press_Start_2P'] text-[#4ade80]"
            style={{ textShadow: "2px 2px 0 #2d7a50" }}
          >
            BLIND CODE
          </Link>
          <Link
            href={`/game/${game.shortCode}`}
            className="text-[10px] font-['Press_Start_2P'] text-[#4ade80] hover:text-white transition"
          >
            View Lobby
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Game Status & Controls */}
        <div
          className="bg-[#0a0a12] border-4 border-[#3a9364] p-6 mb-8"
          style={{ boxShadow: "6px 6px 0 0 #2d7a50" }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1
                className="text-xl font-['Press_Start_2P'] text-[#4ade80] mb-3"
                style={{ textShadow: "2px 2px 0 #2d7a50" }}
              >
                {game.title}
              </h1>
              <p className="text-[10px] font-['Press_Start_2P']">
                Status:{" "}
                <span
                  className={`${
                    game.status === "draft"
                      ? "text-gray-400"
                      : game.status === "lobby"
                        ? "text-yellow-400"
                        : game.status === "active"
                          ? "text-[#4ade80]"
                          : game.status === "voting"
                            ? "text-purple-400"
                            : "text-gray-400"
                  }`}
                >
                  {game.status.toUpperCase()}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {canEdit && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-[#1a1a2e] hover:bg-[#2a2a4e] font-['Press_Start_2P'] text-[8px] uppercase transition border-2 border-gray-600"
                  style={{ boxShadow: "3px 3px 0 0 #333" }}
                >
                  Edit
                </button>
              )}
              {game.status === "draft" && (
                <button
                  onClick={handleOpenLobby}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 font-['Press_Start_2P'] text-[8px] uppercase transition"
                  style={{ boxShadow: "3px 3px 0 0 #997700" }}
                >
                  Open Lobby
                </button>
              )}
              {game.status === "lobby" && (
                <button
                  onClick={handleStartGame}
                  className="px-4 py-2 bg-[#3a9364] hover:bg-[#4ade80] hover:text-[#0a0a12] font-['Press_Start_2P'] text-[8px] uppercase transition"
                  style={{ boxShadow: "3px 3px 0 0 #2d7a50" }}
                >
                  Start Game
                </button>
              )}
              {game.status === "active" && (
                <button
                  onClick={handleEndGame}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 font-['Press_Start_2P'] text-[8px] uppercase transition"
                  style={{ boxShadow: "3px 3px 0 0 #553399" }}
                >
                  End & Vote
                </button>
              )}
              {game.status === "voting" && (
                <button
                  onClick={handleFinishGame}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 font-['Press_Start_2P'] text-[8px] uppercase transition"
                  style={{ boxShadow: "3px 3px 0 0 #333" }}
                >
                  Finish
                </button>
              )}
              {(game.status === "active" || game.status === "voting" || game.status === "finished") && (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-4 py-2 bg-[#1a1a2e] hover:bg-orange-500 text-orange-400 hover:text-white font-['Press_Start_2P'] text-[8px] uppercase transition border-2 border-orange-500"
                  style={{ boxShadow: "3px 3px 0 0 #996633" }}
                >
                  Reset
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-[#1a1a2e] hover:bg-[#ff6b6b] text-[#ff6b6b] hover:text-white font-['Press_Start_2P'] text-[8px] uppercase transition border-2 border-[#ff6b6b]"
                style={{ boxShadow: "3px 3px 0 0 #993333" }}
              >
                Delete
              </button>
            </div>
          </div>

          {/* Share Link */}
          <div className="bg-[#1a1a2e] border-2 border-[#3a9364] p-4">
            <label className="block text-[10px] font-['Press_Start_2P'] text-[#ff6b6b] mb-3">
              Share Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-[#0a0a12] border border-gray-700 px-4 py-2 text-sm font-mono"
              />
              <button
                onClick={copyShareUrl}
                className="px-4 py-2 bg-[#3a9364] hover:bg-[#4ade80] hover:text-[#0a0a12] font-['Press_Start_2P'] text-[8px] uppercase transition"
                style={{ boxShadow: "3px 3px 0 0 #2d7a50" }}
              >
                Copy
              </button>
            </div>
            <p className="mt-3 text-[8px] font-['Press_Start_2P'] text-gray-500">
              Code: <span className="text-[#4ade80]">{game.shortCode}</span>
            </p>
          </div>
        </div>

        {/* Edit Game Form */}
        {isEditing && (
          <div
            className="bg-[#0a0a12] border-4 border-[#3a9364] p-6 mb-8"
            style={{ boxShadow: "6px 6px 0 0 #2d7a50" }}
          >
            <h2 className="text-sm font-['Press_Start_2P'] text-[#ff6b6b] mb-6">
              {">> Edit Game"}
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Game Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Reference Image
                </label>
                <ImageUpload
                  endpoint="referenceImage"
                  onUploadComplete={setEditReferenceImageUrl}
                  currentImage={editReferenceImageUrl}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Color Palette
                </label>
                <div className="space-y-3">
                  {editHexColors.map((color, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={color.name}
                        onChange={(e) => updateColorName(index, e.target.value)}
                        className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                        placeholder="Background"
                      />
                      <input
                        type="text"
                        value={color.hex}
                        onChange={(e) => updateColorHex(index, e.target.value)}
                        className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-green-500"
                        placeholder="#FF5733"
                      />
                      {color.hex && (
                        <div
                          className="w-10 h-10 rounded border border-gray-700 shrink-0"
                          style={{ backgroundColor: color.hex }}
                        />
                      )}
                      {editHexColors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeColor(index)}
                          className="text-red-400 hover:text-red-300 px-2 shrink-0"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addColor}
                    className="text-sm text-green-400 hover:text-green-300"
                  >
                    + Add Color
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Requirements (optional)
                </label>
                <textarea
                  value={editRequirements}
                  onChange={(e) => setEditRequirements(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500"
                  placeholder="Must include a header, nav, and footer..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={editDuration}
                  onChange={(e) => setEditDuration(Number(e.target.value))}
                  min={5}
                  max={60}
                  className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-3 bg-[#1a1a2e] hover:bg-[#2a2a4e] font-['Press_Start_2P'] text-[10px] uppercase transition border-2 border-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-[#3a9364] hover:bg-[#4ade80] hover:text-[#0a0a12] font-['Press_Start_2P'] text-[10px] uppercase transition disabled:opacity-50"
                  style={{ boxShadow: "4px 4px 0 0 #2d7a50" }}
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Details (when not editing) */}
        {!isEditing && (
          <div
            className="bg-[#0a0a12] border-4 border-[#3a9364] p-6 mb-8"
            style={{ boxShadow: "6px 6px 0 0 #2d7a50" }}
          >
            <h2 className="text-sm font-['Press_Start_2P'] text-[#ff6b6b] mb-6">
              {">> Game Details"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Description
                </label>
                <p className="text-gray-300 whitespace-pre-wrap">{game.description}</p>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Reference Image
                </label>
                <img
                  src={game.referenceImageUrl}
                  alt="Reference"
                  className="max-w-sm rounded-lg border border-gray-700"
                />
              </div>

              {game.hexColors.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 mb-2">
                    Color Palette
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {game.hexColors.map((color, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2"
                      >
                        <div
                          className="w-6 h-6 rounded border border-gray-600"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-300">
                            {color.name}
                          </span>
                          <code className="text-xs text-gray-500">
                            {color.hex}
                          </code>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {game.requirements && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Requirements
                  </label>
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {game.requirements}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Duration
                </label>
                <p className="text-gray-300">{game.durationMinutes} minutes</p>
              </div>
            </div>
          </div>
        )}

        {/* Players */}
        <div
          className="bg-[#0a0a12] border-4 border-[#3a9364] p-6 mb-8"
          style={{ boxShadow: "6px 6px 0 0 #2d7a50" }}
        >
          <h2 className="text-sm font-['Press_Start_2P'] text-[#ff6b6b] mb-6">
            {">> Players"}{" "}
            <span className="text-[#4ade80]">
              ({players?.filter((p) => p.isActive).length || 0})
            </span>
          </h2>
          {players && players.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {players
                .filter((p) => p.isActive)
                .map((player) => (
                  <div
                    key={player._id}
                    className="bg-[#1a1a2e] border-2 border-[#3a9364] px-4 py-3 flex items-center gap-3"
                  >
                    {player.user?.avatarUrl ? (
                      <img
                        src={player.user.avatarUrl}
                        alt={player.handle}
                        className="w-8 h-8 border-2 border-[#3a9364]"
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      <div className="w-8 h-8 bg-[#3a9364] flex items-center justify-center text-sm font-['Press_Start_2P'] text-[#0a0a12]">
                        {player.handle[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-['Press_Start_2P'] text-[#4ade80] truncate">
                      {player.handle}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-[10px] font-['Press_Start_2P'] text-gray-500">
              No players yet. Share the link!
            </p>
          )}
        </div>

        {/* Assets Management */}
        <div
          className="bg-[#0a0a12] border-4 border-[#3a9364] p-6 mb-8"
          style={{ boxShadow: "6px 6px 0 0 #2d7a50" }}
        >
          <h2 className="text-sm font-['Press_Start_2P'] text-[#ff6b6b] mb-6">
            {">> Assets"}
          </h2>

          {/* Add Asset Form */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                placeholder="Asset name"
                className="w-48 bg-[#1a1a2e] border-2 border-[#3a9364] px-4 py-2 text-sm focus:outline-none focus:border-[#4ade80]"
              />
              <select
                value={newAssetType}
                onChange={(e) =>
                  setNewAssetType(e.target.value as "image" | "font" | "other")
                }
                className="w-28 bg-[#1a1a2e] border-2 border-[#3a9364] px-4 py-2 text-sm focus:outline-none focus:border-[#4ade80]"
              >
                <option value="image">Image</option>
                <option value="font">Font</option>
                <option value="other">Other</option>
              </select>
              <label
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#3a9364] hover:bg-[#4ade80] hover:text-[#0a0a12] cursor-pointer transition font-['Press_Start_2P'] text-[8px] uppercase"
                style={{ boxShadow: "3px 3px 0 0 #2d7a50" }}
              >
                <input
                  ref={assetFileInputRef}
                  type="file"
                  onChange={handleAssetFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
                {isUploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Upload</span>
                )}
              </label>
            </div>
          </div>

          {/* Assets List */}
          {assets && assets.length > 0 ? (
            <div className="space-y-2">
              {assets.map((asset) => (
                <div
                  key={asset._id}
                  className="flex items-center justify-between bg-[#1a1a2e] border-2 border-[#3a9364] px-4 py-3"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-['Press_Start_2P'] text-[#4ade80]">
                      {asset.name}
                    </span>
                    <code className="text-[10px] text-[#0df] bg-[#0a0a12] px-2 py-1 border border-[#0df]">
                      /a/{asset.shortCode}
                    </code>
                    <span className="text-[10px] text-gray-500">
                      {asset.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-['Press_Start_2P'] text-[#0df] hover:text-white"
                    >
                      View
                    </a>
                    <button
                      onClick={() => removeAsset({ assetId: asset._id })}
                      className="text-[10px] font-['Press_Start_2P'] text-[#ff6b6b] hover:text-white"
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] font-['Press_Start_2P'] text-gray-500">
              No assets. Add images/fonts for players.
            </p>
          )}

          <p className="mt-4 text-[8px] font-['Press_Start_2P'] text-gray-500">
            Use short URLs: <code className="text-[#4ade80]">/a/abc1</code>
          </p>
        </div>

        {/* Entries (for voting stage) */}
        {(game.status === "voting" || game.status === "finished") &&
          entries &&
          entries.length > 0 && (
            <div
              className="bg-[#0a0a12] border-4 border-[#3a9364] p-6"
              style={{ boxShadow: "6px 6px 0 0 #2d7a50" }}
            >
              <h2 className="text-sm font-['Press_Start_2P'] text-[#ff6b6b] mb-6">
                {">> Submissions"}
              </h2>
              <div className="space-y-4">
                {entries.map((entry) => (
                  <div
                    key={entry._id}
                    className="bg-[#1a1a2e] border-2 border-[#3a9364] p-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                      <span className="text-xs font-['Press_Start_2P'] text-[#4ade80]">
                        {entry.player?.handle}
                      </span>
                      <div className="flex flex-wrap items-center gap-4 text-[8px] font-['Press_Start_2P'] text-gray-400">
                        <span>
                          Score:{" "}
                          <span className="text-[#4ade80]">
                            {entry.totalScore}
                          </span>
                        </span>
                        <span>
                          Streak:{" "}
                          <span className="text-[#0df]">{entry.maxStreak}</span>
                        </span>
                        <span>
                          Keys:{" "}
                          <span className="text-[#ff6b6b]">
                            {entry.totalKeystrokes}
                          </span>
                        </span>
                        <button
                          onClick={() =>
                            setPlaybackEntry({
                              id: entry._id,
                              playerName: entry.player?.handle || "Unknown",
                            })
                          }
                          className="px-3 py-1 bg-[#0df] text-[#0a0a12] hover:bg-white transition"
                        >
                          Playback
                        </button>
                      </div>
                    </div>
                    <div className="bg-[#0a0a12] border border-[#3a9364] p-3 max-h-40 overflow-auto">
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                        {entry.html || "(empty)"}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href={`/results/${game.shortCode}`}
                className="mt-6 block text-center px-4 py-3 bg-purple-600 hover:bg-purple-500 font-['Press_Start_2P'] text-[10px] uppercase transition"
                style={{ boxShadow: "4px 4px 0 0 #553399" }}
              >
                Results & Voting
              </Link>
            </div>
          )}
      </div>

      {/* Playback Modal */}
      {playbackEntry && (
        <Playback
          entryId={playbackEntry.id}
          playerName={playbackEntry.playerName}
          onClose={() => setPlaybackEntry(null)}
          autoPlay={playbackEntry.autoPlay}
          targetDuration={15}
        />
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div
            className="bg-[#0a0a12] border-4 border-orange-500 max-w-md w-full p-6"
            style={{ boxShadow: "8px 8px 0 0 #996633" }}
          >
            <h2 className="text-sm font-['Press_Start_2P'] mb-6 text-orange-400">
              {">> Reset Game"}
            </h2>
            <p className="text-gray-300 text-sm mb-4">
              Reset{" "}
              <span className="text-[#4ade80] font-['Press_Start_2P'] text-[10px]">
                {game.title}
              </span>
              ?
            </p>
            <p className="text-[10px] font-['Press_Start_2P'] text-gray-400 mb-4">
              This will delete all player data:
            </p>
            <ul className="text-[10px] font-['Press_Start_2P'] text-gray-500 mb-6 space-y-2">
              <li>- All players</li>
              <li>- All submissions</li>
              <li>- All votes</li>
              <li>- All progress snapshots</li>
            </ul>
            <p className="text-[10px] font-['Press_Start_2P'] text-[#4ade80] mb-6">
              Game settings and assets will be kept.
            </p>
            <p className="text-[10px] font-['Press_Start_2P'] text-orange-400 mb-6">
              Cannot be undone!
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="flex-1 px-4 py-3 bg-[#1a1a2e] hover:bg-[#2a2a4e] font-['Press_Start_2P'] text-[10px] uppercase transition disabled:opacity-50 border-2 border-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleResetGame}
                disabled={isResetting}
                className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-400 text-[#0a0a12] font-['Press_Start_2P'] text-[10px] uppercase transition disabled:opacity-50"
                style={{ boxShadow: "4px 4px 0 0 #996633" }}
              >
                {isResetting ? "..." : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div
            className="bg-[#0a0a12] border-4 border-[#ff6b6b] max-w-md w-full p-6"
            style={{ boxShadow: "8px 8px 0 0 #993333" }}
          >
            <h2 className="text-sm font-['Press_Start_2P'] mb-6 text-[#ff6b6b]">
              {">> Delete Game"}
            </h2>
            <p className="text-gray-300 text-sm mb-4">
              Delete{" "}
              <span className="text-[#4ade80] font-['Press_Start_2P'] text-[10px]">
                {game.title}
              </span>
              ?
            </p>
            <ul className="text-[10px] font-['Press_Start_2P'] text-gray-500 mb-6 space-y-2">
              <li>- All submissions</li>
              <li>- All votes</li>
              <li>- All assets</li>
            </ul>
            <p className="text-[10px] font-['Press_Start_2P'] text-[#ff6b6b] mb-6">
              Cannot be undone!
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-[#1a1a2e] hover:bg-[#2a2a4e] font-['Press_Start_2P'] text-[10px] uppercase transition disabled:opacity-50 border-2 border-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGame}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-[#ff6b6b] hover:bg-white text-[#0a0a12] font-['Press_Start_2P'] text-[10px] uppercase transition disabled:opacity-50"
                style={{ boxShadow: "4px 4px 0 0 #993333" }}
              >
                {isDeleting ? "..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
