/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/chess_escrow.json`.
 */
export type ChessEscrow = {
  "address": "F4Py3YTF1JGhbY9ACztXaseFF89ZfLS69ke5Z7EBGQGr",
  "metadata": {
    "name": "chessEscrow",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "cancelGame",
      "docs": [
        "Cancel game (only if not started or both players agree)"
      ],
      "discriminator": [
        121,
        194,
        154,
        118,
        103,
        235,
        149,
        52
      ],
      "accounts": [
        {
          "name": "gameEscrow",
          "writable": true
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "gameVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "gameEscrow"
              }
            ]
          }
        },
        {
          "name": "playerWhite",
          "writable": true
        },
        {
          "name": "playerBlack",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "declareResult",
      "docs": [
        "Declare game result and distribute funds"
      ],
      "discriminator": [
        205,
        129,
        155,
        217,
        131,
        167,
        175,
        38
      ],
      "accounts": [
        {
          "name": "gameEscrow",
          "writable": true
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "gameVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "gameEscrow"
              }
            ]
          }
        },
        {
          "name": "playerWhite",
          "writable": true
        },
        {
          "name": "playerBlack",
          "writable": true
        },
        {
          "name": "feeCollector",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "winner",
          "type": {
            "defined": {
              "name": "gameWinner"
            }
          }
        },
        {
          "name": "reason",
          "type": {
            "defined": {
              "name": "gameEndReason"
            }
          }
        }
      ]
    },
    {
      "name": "depositStake",
      "docs": [
        "Player deposits their stake"
      ],
      "discriminator": [
        160,
        167,
        9,
        220,
        74,
        243,
        228,
        43
      ],
      "accounts": [
        {
          "name": "gameEscrow",
          "writable": true
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "gameVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "gameEscrow"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "handleTimeout",
      "docs": [
        "Handle timeout (can be called by anyone after time limit exceeded)"
      ],
      "discriminator": [
        55,
        38,
        141,
        178,
        11,
        84,
        214,
        227
      ],
      "accounts": [
        {
          "name": "gameEscrow",
          "writable": true
        },
        {
          "name": "gameVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "gameEscrow"
              }
            ]
          }
        },
        {
          "name": "playerWhite",
          "writable": true
        },
        {
          "name": "playerBlack",
          "writable": true
        },
        {
          "name": "feeCollector",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeGame",
      "docs": [
        "Initialize a new chess game escrow"
      ],
      "discriminator": [
        44,
        62,
        102,
        247,
        126,
        208,
        130,
        215
      ],
      "accounts": [
        {
          "name": "gameEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "roomId"
              }
            ]
          }
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "feeCollector"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "roomId",
          "type": "string"
        },
        {
          "name": "stakeAmount",
          "type": "u64"
        },
        {
          "name": "timeLimitSeconds",
          "type": "i64"
        }
      ]
    },
    {
      "name": "joinGame",
      "docs": [
        "Second player joins the game"
      ],
      "discriminator": [
        107,
        112,
        18,
        38,
        56,
        173,
        60,
        128
      ],
      "accounts": [
        {
          "name": "gameEscrow",
          "writable": true
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "recordMove",
      "docs": [
        "Record a move (for anti-cheat and timing)"
      ],
      "discriminator": [
        111,
        244,
        88,
        207,
        200,
        48,
        59,
        2
      ],
      "accounts": [
        {
          "name": "gameEscrow",
          "writable": true
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "moveNotation",
          "type": "string"
        },
        {
          "name": "gamePositionHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "gameEscrow",
      "discriminator": [
        37,
        195,
        2,
        234,
        81,
        128,
        248,
        133
      ]
    }
  ],
  "events": [
    {
      "name": "gameCancelled",
      "discriminator": [
        113,
        20,
        200,
        104,
        76,
        35,
        9,
        241
      ]
    },
    {
      "name": "gameCreated",
      "discriminator": [
        218,
        25,
        150,
        94,
        177,
        112,
        96,
        2
      ]
    },
    {
      "name": "gameFinished",
      "discriminator": [
        0,
        128,
        235,
        237,
        115,
        180,
        62,
        221
      ]
    },
    {
      "name": "gameStarted",
      "discriminator": [
        222,
        247,
        78,
        255,
        61,
        184,
        156,
        41
      ]
    },
    {
      "name": "moveRecorded",
      "discriminator": [
        198,
        243,
        206,
        103,
        150,
        145,
        178,
        34
      ]
    },
    {
      "name": "playerJoined",
      "discriminator": [
        39,
        144,
        49,
        106,
        108,
        210,
        183,
        38
      ]
    },
    {
      "name": "stakeDeposited",
      "discriminator": [
        69,
        152,
        144,
        109,
        232,
        34,
        225,
        19
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "roomIdTooLong",
      "msg": "Room ID too long (max 32 characters)"
    },
    {
      "code": 6001,
      "name": "invalidStakeAmount",
      "msg": "Invalid stake amount"
    },
    {
      "code": 6002,
      "name": "invalidTimeLimit",
      "msg": "Invalid time limit"
    },
    {
      "code": 6003,
      "name": "gameNotWaitingForPlayers",
      "msg": "Game is not waiting for players"
    },
    {
      "code": 6004,
      "name": "cannotPlayAgainstSelf",
      "msg": "Cannot play against yourself"
    },
    {
      "code": 6005,
      "name": "invalidGameStateForDeposit",
      "msg": "Invalid game state for deposit"
    },
    {
      "code": 6006,
      "name": "unauthorizedPlayer",
      "msg": "Unauthorized player"
    },
    {
      "code": 6007,
      "name": "alreadyDeposited",
      "msg": "Player has already deposited"
    },
    {
      "code": 6008,
      "name": "gameNotInProgress",
      "msg": "Game is not in progress"
    },
    {
      "code": 6009,
      "name": "moveNotationTooLong",
      "msg": "Move notation too long"
    },
    {
      "code": 6010,
      "name": "moveTimeExceeded",
      "msg": "Move time exceeded"
    },
    {
      "code": 6011,
      "name": "invalidWinnerDeclaration",
      "msg": "Invalid winner declaration"
    },
    {
      "code": 6012,
      "name": "invalidDrawDeclaration",
      "msg": "Invalid draw declaration"
    },
    {
      "code": 6013,
      "name": "cannotCancelStartedGame",
      "msg": "Cannot cancel a started game"
    },
    {
      "code": 6014,
      "name": "timeNotExceeded",
      "msg": "Time limit not exceeded"
    }
  ],
  "types": [
    {
      "name": "gameCancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "roomId",
            "type": "string"
          },
          {
            "name": "cancelledBy",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "gameCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "roomId",
            "type": "string"
          },
          {
            "name": "playerWhite",
            "type": "pubkey"
          },
          {
            "name": "stakeAmount",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "gameEndReason",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "checkmate"
          },
          {
            "name": "resignation"
          },
          {
            "name": "timeout"
          },
          {
            "name": "agreement"
          },
          {
            "name": "stalemate"
          },
          {
            "name": "abandonment"
          }
        ]
      }
    },
    {
      "name": "gameEscrow",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "roomId",
            "type": "string"
          },
          {
            "name": "playerWhite",
            "type": "pubkey"
          },
          {
            "name": "playerBlack",
            "type": "pubkey"
          },
          {
            "name": "stakeAmount",
            "type": "u64"
          },
          {
            "name": "totalDeposited",
            "type": "u64"
          },
          {
            "name": "gameState",
            "type": {
              "defined": {
                "name": "gameState"
              }
            }
          },
          {
            "name": "winner",
            "type": {
              "defined": {
                "name": "gameWinner"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "startedAt",
            "type": "i64"
          },
          {
            "name": "finishedAt",
            "type": "i64"
          },
          {
            "name": "timeLimitSeconds",
            "type": "i64"
          },
          {
            "name": "feeCollector",
            "type": "pubkey"
          },
          {
            "name": "whiteDeposited",
            "type": "bool"
          },
          {
            "name": "blackDeposited",
            "type": "bool"
          },
          {
            "name": "moveCount",
            "type": "u32"
          },
          {
            "name": "lastMoveTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "gameFinished",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "roomId",
            "type": "string"
          },
          {
            "name": "winner",
            "type": {
              "defined": {
                "name": "gameWinner"
              }
            }
          },
          {
            "name": "reason",
            "type": {
              "defined": {
                "name": "gameEndReason"
              }
            }
          },
          {
            "name": "finishedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "gameStarted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "roomId",
            "type": "string"
          },
          {
            "name": "startedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "gameState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "waitingForPlayers"
          },
          {
            "name": "waitingForDeposits"
          },
          {
            "name": "inProgress"
          },
          {
            "name": "finished"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "gameWinner",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "none"
          },
          {
            "name": "white"
          },
          {
            "name": "black"
          },
          {
            "name": "draw"
          }
        ]
      }
    },
    {
      "name": "moveRecorded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "roomId",
            "type": "string"
          },
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "moveCount",
            "type": "u32"
          },
          {
            "name": "moveNotation",
            "type": "string"
          },
          {
            "name": "positionHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "playerJoined",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "roomId",
            "type": "string"
          },
          {
            "name": "playerBlack",
            "type": "pubkey"
          },
          {
            "name": "joinedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "stakeDeposited",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "roomId",
            "type": "string"
          },
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
