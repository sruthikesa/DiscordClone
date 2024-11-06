"use client";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  SendIcon,
  MoreVerticalIcon,
  TrashIcon,
  Loader,
  LoaderIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { ScrollArea, ScrollAreaViewport } from "@radix-ui/react-scroll-area";
import { Doc, Id } from "../../../../../convex/_generated/dataModel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";

import { useMutation, useQuery } from "convex/react";
import { use, useEffect, useRef, useState } from "react";
import { FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { PlusIcon } from "@radix-ui/react-icons";
import Image from "next/image";

export default function MessagePage({
  params,
}: {
  params: Promise<{ id: Id<"directMessages"> }>;
}) {
  const { id } = use(params);
  const directMessage = useQuery(api.functions.dm.get, {
    id,
  });
  const messages = useQuery(api.functions.message.list, { directMessage: id });
  // Ref for the ScrollAreaViewport
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  if (!directMessage) {
    return null;
  }
  return (
    <div className="flex flex-col flex-1 divide-y max-h-screen">
      <header className="flex items-center gap-2 p-4">
        <Avatar className="size-8 border">
          <AvatarImage src={directMessage.user.image} />
          <AvatarFallback></AvatarFallback>
        </Avatar>
        <h1 className="font-semibold">{directMessage.user.username}</h1>
      </header>
      <ScrollArea className="flex-1">
        <ScrollAreaViewport ref={scrollAreaRef} className="h-full">
          {messages?.map((message) => (
            <MessageItem key={message._id} message={message} />
          ))}
        </ScrollAreaViewport>
      </ScrollArea>
      <TypingIndicator directMessage={directMessage._id} />
      <div className="sticky bottom-0 bg-white">
        <MessageInput
          directMessage={directMessage._id}
          scrollAreaRef={scrollAreaRef}
        />
      </div>
    </div>
  );
}

function TypingIndicator({
  directMessage,
}: {
  directMessage: Id<"directMessages">;
}) {
  const username = useQuery(api.functions.typing.list, { directMessage });
  if (!username || username?.length === 0) {
    return null;
  }
  return (
    <div className="text-sm text-muted-forground px-4 py-2">
      {username.join(",")} is typing...
    </div>
  );
}
type Message = FunctionReturnType<typeof api.functions.message.list>[number];
function MessageItem({ message }: { message: Message }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <Avatar className="size-8 border">
        {message.sender && <AvatarImage src={message.sender?.image} />}
        <AvatarFallback></AvatarFallback>
      </Avatar>
      <div className="flex flex-col mr-auto">
        <p className="text-xs text-muted-foreground">
          {message.sender?.username ?? "Deleted User"}
        </p>
        {message.deleted ? (
          <>
            <p className="text-sm text-destructive">
              This message was deleted.
              {message.deletedReason && (
                <span> Reason: {message.deletedReason}</span>
              )}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm ">{message.content}</p>
            {message.attatchment && (
              <Image
                src={message.attatchment}
                alt="Attatchment"
                width={300}
                height={300}
                className="rounded border overflow-hidden"
              />
            )}
          </>
        )}
      </div>
      <MessageActions message={message} />
    </div>
  );
}
function MessageActions({ message }: { message: Message }) {
  const user = useQuery(api.functions.user.get);
  const removeMutation = useMutation(api.functions.message.remove);
  if (!user || message.sender?._id !== user._id) {
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <MoreVerticalIcon className="size-4 text-muted-foreground" />
        <span className="sr-only">Message Actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => removeMutation({ id: message._id })}
        >
          <TrashIcon />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
function MessageInput({
  directMessage,
  scrollAreaRef,
}: {
  directMessage: Id<"directMessages">;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
}) {
  const [content, setContent] = useState("");
  const sendMessage = useMutation(api.functions.message.create);
  const sendTypingIndicator = useMutation(api.functions.typing.upsert);
  const [file, setFile] = useState<File>();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadURL = useMutation(
    api.functions.message.generateUploadUrl
  );
  const removeAttatchment = useMutation(api.functions.storage.remove);
  const [attatchment, setAttatchment] = useState<Id<"_storage">>();
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setFile(file);
    setIsUploading(true);
    const url = await generateUploadURL();
    const res = await fetch(url, {
      method: "POST",
      body: file,
    });
    const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
    setAttatchment(storageId);
    setIsUploading(false);
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await sendMessage({ directMessage, attatchment, content });
      setContent("");
      setAttatchment(undefined);
      setFile(undefined);
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  return (
    <>
      <form className="flex items-end p-4 gap-2" onSubmit={handleSubmit}>
        <Button
          type="button"
          size="icon"
          onClick={() => {
            fileInputRef.current?.click();
          }}
        >
          <PlusIcon />
          <span className="sr-only">Attatchment</span>
        </Button>
        <div className="flex flex-col flex-1 gap-2">
          {file && (
            <ImagePreview
              file={file}
              isUploading={isUploading}
              onDelete={async () => {
                if (attatchment) {
                  const url = await removeAttatchment({
                    storageId: attatchment,
                  });
                  console.log(url);
                }
                setAttatchment(undefined);
                setFile(undefined);
                if (fileInputRef.current) {
                  fileInputRef.current!.value = "";
                }
              }}
            />
          )}
          <Input
            placeholder="Message"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (content.length > 0) {
                sendTypingIndicator({ directMessage });
              }
            }}
          />
        </div>
        <Button size="icon">
          <SendIcon />
          <span className="sr-only">Send</span>
        </Button>
      </form>

      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImageUpload}
      />
    </>
  );
}

function ImagePreview({
  file,
  isUploading,
  onDelete,
}: {
  file: File;
  isUploading: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="relative size-40 overflow-hidden rounded border group">
      <Image
        src={URL.createObjectURL(file)}
        alt="Attachment"
        width={300}
        height={300}
      />
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <LoaderIcon className="animate-spin size-8" />
        </div>
      )}
      <Button
        type="button"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        variant="destructive"
        size="icon"
        onClick={onDelete}
      >
        <TrashIcon />
        <span className="sr-only">Delete</span>
      </Button>
    </div>
  );
}
