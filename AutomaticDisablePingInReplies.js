/**
* @name AutomaticDisablePingInReplies
* @displayName AutomaticDisablePingInReplies
* @authorId 706249082158710855
* @invite 7HSYXef577
*/

module.exports = (() => {
    const config = {
        info: {
            name: "AutomaticDisablePingInReplies",
            authors: [
                {
                    name: "Liam Abu",
                    discord_id: "706249082158710855",
                    github_username: "Liamabu",
                    twitter_username: "LiamAbu_Dev"
                }
            ],
            version: "1.0.0",
            description: "Suppresses mentions from Replied messages and when replying to someone else.",
            github: "https://github.com/Strencher/BetterDiscordStuff/blob/master/AutomaticDisablePingInReplies/AutomaticDisablePingInReplies.plugin.js",
            github_raw: "https://raw.githubusercontent.com/Strencher/BetterDiscordStuff/master/AutomaticDisablePingInReplies/AutomaticDisablePingInReplies.plugin.js"
        },
        changelog: [
            {
                title: "Release",
                type: "added",
                items: ["The plugin was made by Liam Abu - JustMe#0001 - @LiamAbu_Dev \n(Super was always mad about pings so I did it :D). Enjoy!"]
            }
        ],
        defaultConfig: [
            {
                type: "switch",
                id: "autoDisableMention",
                name: "Disable Mention",
                note: "Automatically disables the 'Mention' option when replying to someone else.",
                value: true
            }
        ]
    };

    return !global.ZeresPluginLibrary ? class {
        constructor() { this._config = config; }
        getName() { return config.info.name; }
        getAuthor() { return config.info.authors.map(a => a.name).join(", "); }
        getDescription() { return config.info.description; }
        getVersion() { return config.info.version; }
        load() {
            BdApi.showConfirmationModal("Library plugin is needed", 
                [`The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`], {
                    confirmText: "Download",
                    cancelText: "Cancel",
                    onConfirm: () => {
                        require("request").get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", async (error, response, body) => {
                        if (error) return require("electron").shell.openExternal("https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                        });
                    }
                });
        }
        start() { }
        stop() { }
    } : (([Plugin, Api]) => {
        const plugin = (Plugin, Api) => {

            const {PluginUtilities, Utilities, WebpackModules, DiscordModules, Patcher, DiscordModules: {React, DiscordConstants: {ActionTypes}}} = Api;
            const suppressed = [];
            const UserUtils = WebpackModules.getByProps("getCurrentUser");
            const Tooltip = WebpackModules.getByDisplayName("Tooltip");

            return class AutomaticDisablePingInReplies extends Plugin {
                constructor() {
                    super();
                }

                onStart() {
                    PluginUtilities.addStyle(config.info.name, this.css);
                    this.patchMessageCreate();
                    this.patchRepliedMessage();
                    this.patchCreateReply();
                }

                css = `
                    .suppressedMention {color: var(--text-muted);}
                `;

                patchMessageCreate() {
                    Patcher.before(DiscordModules.Dispatcher, "_dispatch", (_, [{message, type}]) => {
                        if (type != ActionTypes.MESSAGE_CREATE) return;
                        const currentUser = UserUtils.getCurrentUser();
                        if (!currentUser || !Array.isArray(message.mentions) || !message.referenced_message) return;

                        const mentionIndex = message.mentions.findIndex(e => e.id === currentUser.id);
                        if (message.referenced_message.author.id === currentUser.id && mentionIndex > -1) {
                            message.mentions.splice(mentionIndex, 1);
                            suppressed.push(message.id);
                        }
                    });
                }

                patchCreateReply() {
                    Patcher.before(WebpackModules.getByProps("createPendingReply"), "createPendingReply", (_, [args]) => {
                        if (!this.settings.autoDisableMention) return;
                        args.shouldMention = false;
                    });
                }

                patchRepliedMessage() {
                    Patcher.after(ZLibrary.WebpackModules.getModule(m => m && m.default && m.default.displayName == "RepliedMessage"), "default", (_, [args], returnValue) => {
                        if (!args || !args.baseMessage || suppressed.indexOf(args.baseMessage.id) < 0) return;

                        const message = Utilities.findInReactTree(returnValue, e => e && e.props && e.props.compact != undefined);
                        if (!message) return;

                        const unpatch = Patcher.after(message, "type", (_, __, returnValue) => {
                            unpatch();
                            if (!returnValue || !returnValue.props || !Array.isArray(returnValue.props.children)) return;

                            returnValue.props.children.unshift(React.createElement(Tooltip, {
                                text: "Mention Suppressed",
                                position: "top"
                            }, props => React.createElement("span", Object.assign(props, {
                                className: "suppressedMention"
                            }), "@")));
                        })
                    });
                }
                
                onStop() {
                    PluginUtilities.removeStyle(config.info.name);
                    Patcher.unpatchAll();
                }

                getSettingsPanel() {
                    return this.buildSettingsPanel().getElement();
                }

            }

        };
        return plugin(Plugin, Api);
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();
/*@end@*/
