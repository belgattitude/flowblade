/* eslint-disable sonarjs/no-duplicate-string */
export const NodeService = {
  getTreeNodes() {
    return Promise.resolve(this.getTreeNodesData());
  },

  getTreeNodesData() {
    return [
      {
        children: [
          {
            children: [
              {
                data: "Expenses Document",
                icon: "pi pi-fw pi-file",
                key: "0-0-0",
                label: "Expenses.doc",
              },
              {
                data: "Resume Document",
                icon: "pi pi-fw pi-file",
                key: "0-0-1",
                label: "Resume.doc",
              },
            ],
            data: "Work Folder",
            icon: "pi pi-fw pi-cog",
            key: "0-0",
            label: "Work",
          },
          {
            children: [
              {
                data: "Invoices for this month",
                icon: "pi pi-fw pi-file",
                key: "0-1-0",
                label: "Invoices.txt",
              },
            ],
            data: "Home Folder",
            icon: "pi pi-fw pi-home",
            key: "0-1",
            label: "Home",
          },
        ],
        data: "Documents Folder",
        icon: "pi pi-fw pi-inbox",
        key: "0",
        label: "Documents",
      },
      {
        children: [
          {
            data: "Meeting",
            icon: "pi pi-fw pi-calendar-plus",
            key: "1-0",
            label: "Meeting",
          },
          {
            data: "Product Launch",
            icon: "pi pi-fw pi-calendar-plus",
            key: "1-1",
            label: "Product Launch",
          },
          {
            data: "Report Review",
            icon: "pi pi-fw pi-calendar-plus",
            key: "1-2",
            label: "Report Review",
          },
        ],
        data: "Events Folder",
        icon: "pi pi-fw pi-calendar",
        key: "1",
        label: "Events",
      },
      {
        key: "2",
        label: "Movies",
        data: "Movies Folder",
        // eslint-disable-next-line sonarjs/no-duplicate-string
        icon: "pi pi-fw pi-star-fill",
        children: [
          {
            children: [
              {
                data: "Scarface Movie",
                icon: "pi pi-fw pi-video",
                key: "2-0-0",
                label: "Scarface",
              },
              {
                data: "Serpico Movie",
                icon: "pi pi-fw pi-video",
                key: "2-0-1",
                label: "Serpico",
              },
            ],
            data: "Pacino Movies",
            icon: "pi pi-fw pi-star-fill",
            key: "2-0",
            label: "Al Pacino",
          },
          {
            children: [
              {
                data: "Goodfellas Movie",
                icon: "pi pi-fw pi-video",
                key: "2-1-0",
                label: "Goodfellas",
              },
              {
                data: "Untouchables Movie",
                icon: "pi pi-fw pi-video",
                key: "2-1-1",
                label: "Untouchables",
              },
            ],
            data: "De Niro Movies",
            icon: "pi pi-fw pi-star-fill",
            key: "2-1",
            label: "Robert De Niro",
          },
        ],
      },
    ];
  },

  getTreeTableNodes() {
    return Promise.resolve(this.getTreeTableNodesData());
  },

  getTreeTableNodesData() {
    return [
      {
        children: [
          {
            children: [
              {
                data: {
                  name: "react.app",
                  size: "10kb",
                  type: "Application",
                },
                key: "0-0-0",
              },
              {
                data: {
                  name: "native.app",
                  size: "10kb",
                  type: "Application",
                },
                key: "0-0-1",
              },
              {
                data: {
                  name: "mobile.app",
                  size: "5kb",
                  type: "Application",
                },
                key: "0-0-2",
              },
            ],
            data: {
              name: "React",
              size: "25kb",
              type: "Folder",
            },
            key: "0-0",
          },
          {
            data: {
              name: "editor.app",
              size: "25kb",
              type: "Application",
            },
            key: "0-1",
          },
          {
            data: {
              name: "settings.app",
              size: "50kb",
              type: "Application",
            },
            key: "0-2",
          },
        ],
        data: {
          name: "Applications",
          size: "100kb",
          type: "Folder",
        },
        key: "0",
      },
      {
        children: [
          {
            data: {
              name: "backup-1.zip",
              size: "10kb",
              type: "Zip",
            },
            key: "1-0",
          },
          {
            data: {
              name: "backup-2.zip",
              size: "10kb",
              type: "Zip",
            },
            key: "1-1",
          },
        ],
        data: {
          name: "Cloud",
          size: "20kb",
          type: "Folder",
        },
        key: "1",
      },
      {
        children: [
          {
            data: {
              name: "note-meeting.txt",
              size: "50kb",
              type: "Text",
            },
            key: "2-0",
          },
          {
            data: {
              name: "note-todo.txt",
              size: "100kb",
              type: "Text",
            },
            key: "2-1",
          },
        ],
        data: {
          name: "Desktop",
          size: "150kb",
          type: "Folder",
        },
        key: "2",
      },
      {
        children: [
          {
            children: [
              {
                data: {
                  name: "Expenses.doc",
                  size: "30kb",
                  type: "Document",
                },
                key: "3-0-0",
              },
              {
                data: {
                  name: "Resume.doc",
                  size: "25kb",
                  type: "Resume",
                },
                key: "3-0-1",
              },
            ],
            data: {
              name: "Work",
              size: "55kb",
              type: "Folder",
            },
            key: "3-0",
          },
          {
            children: [
              {
                data: {
                  name: "Invoices",
                  size: "20kb",
                  type: "Text",
                },
                key: "3-1-0",
              },
            ],
            data: {
              name: "Home",
              size: "20kb",
              type: "Folder",
            },
            key: "3-1",
          },
        ],
        data: {
          name: "Documents",
          size: "75kb",
          type: "Folder",
        },
        key: "3",
      },
      {
        children: [
          {
            children: [
              {
                data: {
                  name: "tutorial-a1.txt",
                  size: "5kb",
                  type: "Text",
                },
                key: "4-0-0",
              },
              {
                data: {
                  name: "tutorial-a2.txt",
                  size: "5kb",
                  type: "Text",
                },
                key: "4-0-1",
              },
            ],
            data: {
              name: "Spanish",
              size: "10kb",
              type: "Folder",
            },
            key: "4-0",
          },
          {
            children: [
              {
                data: {
                  name: "Hotel.pdf",
                  size: "10kb",
                  type: "PDF",
                },
                key: "4-1-0",
              },
              {
                data: {
                  name: "Flight.pdf",
                  size: "5kb",
                  type: "PDF",
                },
                key: "4-1-1",
              },
            ],
            data: {
              name: "Travel",
              size: "15kb",
              type: "Text",
            },
            key: "4-1",
          },
        ],
        data: {
          name: "Downloads",
          size: "25kb",
          type: "Folder",
        },
        key: "4",
      },
      {
        children: [
          {
            data: {
              name: "bin",
              size: "50kb",
              type: "Link",
            },
            key: "5-0",
          },
          {
            data: {
              name: "etc",
              size: "100kb",
              type: "Link",
            },
            key: "5-1",
          },
          {
            data: {
              name: "var",
              size: "100kb",
              type: "Link",
            },
            key: "5-2",
          },
        ],
        data: {
          name: "Main",
          size: "50kb",
          type: "Folder",
        },
        key: "5",
      },
      {
        children: [
          {
            data: {
              name: "todo.txt",
              size: "3kb",
              type: "Text",
            },
            key: "6-0",
          },
          {
            data: {
              name: "logo.png",
              size: "2kb",
              type: "Picture",
            },
            key: "6-1",
          },
        ],
        data: {
          name: "Other",
          size: "5kb",
          type: "Folder",
        },
        key: "6",
      },
      {
        children: [
          {
            data: {
              name: "barcelona.jpg",
              size: "90kb",
              type: "Picture",
            },
            key: "7-0",
          },
          {
            data: {
              name: "primeng.png",
              size: "30kb",
              type: "Picture",
            },
            key: "7-1",
          },
          {
            data: {
              name: "prime.jpg",
              size: "30kb",
              type: "Picture",
            },
            key: "7-2",
          },
        ],
        data: {
          name: "Pictures",
          size: "150kb",
          type: "Folder",
        },
        key: "7",
      },
      {
        children: [
          {
            data: {
              name: "primefaces.mkv",
              size: "1000kb",
              type: "Video",
            },
            key: "8-0",
          },
          {
            data: {
              name: "intro.avi",
              size: "500kb",
              type: "Video",
            },
            key: "8-1",
          },
        ],
        data: {
          name: "Videos",
          size: "1500kb",
          type: "Folder",
        },
        key: "8",
      },
    ];
  },
};
